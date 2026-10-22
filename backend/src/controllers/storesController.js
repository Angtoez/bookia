// Gestión de puntos de venta por el administrador, con auditoría transaccional (US3).
import { Reservation } from '../models/Reservation.js';
import { Store } from '../models/Store.js';
import { StoreBook } from '../models/StoreBook.js';
import { record } from '../services/auditService.js';
import { deleteStoreCascade } from '../services/cascadeService.js';
import { runInTransaction } from '../services/transaction.js';
import { notFound } from '../utils/httpError.js';
import { paginate } from '../utils/pagination.js';
import { toStore } from '../utils/presenters.js';

const storeNotFound = () => notFound('Establecimiento no encontrado');

export async function listStores(req, res) {
  const { page, limit } = req.validated.query;
  const result = await paginate(Store, {}, { sort: { name: 1, _id: 1 }, page, limit });
  res.json({ ...result, items: result.items.map(toStore) });
}

export async function getStore(req, res) {
  const store = await Store.findById(req.validated.params.id).lean();
  if (!store) throw storeNotFound();
  res.json(toStore(store));
}

export async function createStore(req, res) {
  const store = await runInTransaction(async (session) => {
    const [created] = await Store.create([req.validated.body], { session });
    await record(
      {
        userId: req.user._id,
        action: 'create',
        entityType: 'store',
        entityId: created._id,
        entityLabel: created.name,
        after: created,
      },
      session,
    );
    return created;
  });
  res.status(201).json(toStore(store));
}

export async function updateStore(req, res) {
  const store = await runInTransaction(async (session) => {
    const found = await Store.findById(req.validated.params.id).session(session);
    if (!found) throw storeNotFound();
    const before = found.toObject();
    found.set(req.validated.body);
    await found.save({ session });
    await record(
      {
        userId: req.user._id,
        action: 'update',
        entityType: 'store',
        entityId: found._id,
        entityLabel: found.name,
        before,
        after: found,
      },
      session,
    );
    return found;
  });
  res.json(toStore(store));
}

export async function getDeletionImpact(req, res) {
  const { id } = req.validated.params;
  if (!(await Store.exists({ _id: id }))) throw storeNotFound();
  const [books, activeReservations] = await Promise.all([
    StoreBook.countDocuments({ store_id: id }),
    Reservation.countDocuments({ store_id: id, is_active: true }),
  ]);
  res.json({ books, active_reservations: activeReservations });
}

export async function deleteStore(req, res) {
  const { id } = req.validated.params;
  await runInTransaction((session) => deleteStoreCascade(id, req.user._id, session));
  res.status(204).end();
}
