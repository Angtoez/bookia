// Inventario de cada punto de venta: asociar, actualizar y desasociar libros (US3, FR-019/020).
import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Store } from '../models/Store.js';
import { StoreBook } from '../models/StoreBook.js';
import { record } from '../services/auditService.js';
import { runInTransaction } from '../services/transaction.js';
import { HttpError, notFound } from '../utils/httpError.js';
import { buildPage, parsePagination } from '../utils/pagination.js';
import { toStoreBookItem } from '../utils/presenters.js';

async function assertStoreExists(storeId) {
  if (!(await Store.exists({ _id: storeId }))) throw notFound('Establecimiento no encontrado');
}

const associationNotFound = () => notFound('El libro no está asociado a este establecimiento');

const auditEntry = (req, action, sb, book, extra) => ({
  userId: req.user._id,
  action,
  entityType: 'store_book',
  entityId: sb._id,
  entityLabel: book?.title ?? '',
  ...extra,
});

export async function listStoreBooks(req, res) {
  const { id } = req.validated.params;
  await assertStoreExists(id);
  const { page, limit, skip } = parsePagination(req.validated.query);
  // Agregación para ordenar por el título del libro asociado.
  const [result] = await StoreBook.aggregate([
    { $match: { store_id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: Book.collection.name,
        localField: 'book_id',
        foreignField: '_id',
        as: 'book',
      },
    },
    { $unwind: '$book' },
    { $sort: { 'book.title_search': 1, _id: 1 } },
    { $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);
  const items = result.items.map((sb) => toStoreBookItem(sb, sb.book));
  res.json(buildPage(items, result.total[0]?.count ?? 0, page, limit));
}

export async function addStoreBook(req, res) {
  const { id } = req.validated.params;
  const { book_id: bookId, stock, store_price_cents: storePrice = null } = req.validated.body;
  await assertStoreExists(id);
  const book = await Book.findById(bookId).lean();
  if (!book) throw notFound('Libro no encontrado');
  const sb = await runInTransaction(async (session) => {
    const [created] = await StoreBook.create(
      [{ store_id: id, book_id: bookId, stock, store_price_cents: storePrice }],
      { session },
    );
    await record(auditEntry(req, 'create', created, book, { after: created }), session);
    return created;
  });
  res.status(201).json(toStoreBookItem(sb, book));
}

export async function updateStoreBook(req, res) {
  const { id, bookId } = req.validated.params;
  const changes = req.validated.body;
  const book = await Book.findById(bookId).lean();
  const sb = await runInTransaction(async (session) => {
    const current = await StoreBook.findOne({ store_id: id, book_id: bookId }).session(session);
    if (!current || !book) throw associationNotFound();
    const filter = { _id: current._id };
    if (changes.stock !== undefined) {
      if (changes.stock < current.reserved_count) throw stockBelowReserved(current);
      // Condición atómica frente a reservas simultáneas (FR-020a).
      filter.reserved_count = mongoose.trusted({ $lte: changes.stock });
    }
    const updated = await StoreBook.findOneAndUpdate(
      filter,
      { $set: changes },
      { new: true, runValidators: true, session },
    );
    if (!updated) throw stockBelowReserved(current);
    await record(
      auditEntry(req, 'update', updated, book, { before: current, after: updated }),
      session,
    );
    return updated;
  });
  res.json(toStoreBookItem(sb, book));
}

function stockBelowReserved(sb) {
  return new HttpError(
    409,
    'STOCK_BELOW_RESERVED',
    `Hay ${sb.reserved_count} unidades reservadas; el stock no puede ser menor`,
  );
}

export async function removeStoreBook(req, res) {
  const { id, bookId } = req.validated.params;
  const book = await Book.findById(bookId).lean();
  await runInTransaction(async (session) => {
    const current = await StoreBook.findOne({ store_id: id, book_id: bookId }).session(session);
    if (!current) throw associationNotFound();
    // Solo se borra si no tiene unidades reservadas.
    const deleted = await StoreBook.findOneAndDelete(
      { _id: current._id, reserved_count: 0 },
      { session },
    );
    if (!deleted) {
      throw new HttpError(
        409,
        'HAS_ACTIVE_RESERVATIONS',
        'No se puede desasociar: hay reservas activas de este libro en el establecimiento',
      );
    }
    await record(auditEntry(req, 'delete', deleted, book, { before: deleted }), session);
  });
  res.status(204).end();
}
