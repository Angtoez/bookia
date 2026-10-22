// Gestión de libros por el administrador, con auditoría transaccional (US2).
import { Book } from '../models/Book.js';
import { Genre } from '../models/Genre.js';
import { Reservation } from '../models/Reservation.js';
import { StoreBook } from '../models/StoreBook.js';
import { record } from '../services/auditService.js';
import { deleteBookCascade } from '../services/cascadeService.js';
import { runInTransaction } from '../services/transaction.js';
import { fieldError, notFound } from '../utils/httpError.js';
import { loadBookDetail } from './booksController.js';

async function assertGenreExists(genreId) {
  const exists = await Genre.exists({ _id: genreId });
  if (!exists) throw fieldError('genre_id', 'El género no existe');
}

export async function createBook(req, res) {
  const data = req.validated.body;
  await assertGenreExists(data.genre_id);
  const book = await runInTransaction(async (session) => {
    const [created] = await Book.create([data], { session });
    await record(
      {
        userId: req.user._id,
        action: 'create',
        entityType: 'book',
        entityId: created._id,
        entityLabel: created.title,
        after: created,
      },
      session,
    );
    return created;
  });
  res.status(201).json(await loadBookDetail(book._id));
}

export async function updateBook(req, res) {
  const { id } = req.validated.params;
  const data = req.validated.body;
  if (data.genre_id) await assertGenreExists(data.genre_id);
  await runInTransaction(async (session) => {
    const book = await Book.findById(id).session(session);
    if (!book) throw notFound('Libro no encontrado');
    const before = book.toObject();
    book.set(data);
    await book.save({ session });
    await record(
      {
        userId: req.user._id,
        action: 'update',
        entityType: 'book',
        entityId: book._id,
        entityLabel: book.title,
        before,
        after: book,
      },
      session,
    );
  });
  res.json(await loadBookDetail(id));
}

export async function getDeletionImpact(req, res) {
  const { id } = req.validated.params;
  const exists = await Book.exists({ _id: id });
  if (!exists) throw notFound('Libro no encontrado');
  const [stores, activeReservations] = await Promise.all([
    StoreBook.countDocuments({ book_id: id }),
    Reservation.countDocuments({ book_id: id, is_active: true }),
  ]);
  // Los favoritos se implementan en US6.
  res.json({ stores, active_reservations: activeReservations, favorites: 0 });
}

export async function deleteBook(req, res) {
  const { id } = req.validated.params;
  await runInTransaction((session) => deleteBookCascade(id, req.user._id, session));
  res.status(204).end();
}
