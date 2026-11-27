// Reservas de libros en puntos de venta sin sobrerreserva (US5, research R8 y R9).
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { Book } from '../models/Book.js';
import { Reservation } from '../models/Reservation.js';
import { Store } from '../models/Store.js';
import { StoreBook, effectivePriceOf } from '../models/StoreBook.js';
import { User } from '../models/User.js';
import { HttpError, notFound } from '../utils/httpError.js';
import { paginate } from '../utils/pagination.js';
import {
  addDays,
  applyTransition,
  expireOverdue,
  invalidTransition,
  isOverdue,
} from './reservationTransitions.js';
import { runInTransaction } from './transaction.js';

const LIST_SORT = { created_at: -1, _id: -1 };

const outOfStock = () =>
  new HttpError(409, 'OUT_OF_STOCK', 'Ya no quedan unidades de este libro en el establecimiento');

const duplicateReservation = () =>
  new HttpError(
    409,
    'DUPLICATE_RESERVATION',
    'Ya tienes una reserva activa de este libro en este establecimiento',
  );

/**
 * Crea una reserva en estado pending. Las actualizaciones condicionales sobre StoreBook y User
 * impiden reservar por encima del stock o del límite, incluso con peticiones simultáneas.
 */
export async function createReservation({ user, bookId, storeId }) {
  return runInTransaction(async (session) => {
    const now = new Date();
    const storeBook = await StoreBook.findOne({ store_id: storeId, book_id: bookId }).session(
      session,
    );
    const book = await Book.findById(bookId).session(session);
    const store = await Store.findById(storeId).session(session);
    if (!storeBook || !book || !store) {
      throw notFound('El libro no está disponible en este establecimiento');
    }

    // Una reserva vencida no ocupa la unidad ni cuenta para el límite.
    await expireOverdue({ store_id: storeId, book_id: bookId }, session, now);
    await expireOverdue({ user_id: user._id }, session, now);

    const duplicate = await Reservation.exists({
      user_id: user._id,
      book_id: bookId,
      store_id: storeId,
      is_active: true,
    }).session(session);
    if (duplicate) throw duplicateReservation();

    const reserved = await StoreBook.findOneAndUpdate(
      { _id: storeBook._id, $expr: mongoose.trusted({ $lt: ['$reserved_count', '$stock'] }) },
      { $inc: { reserved_count: 1 } },
      { new: true, session },
    );
    if (!reserved) throw outOfStock();

    const max = ENV.MAX_ACTIVE_RESERVATIONS;
    const counted = await User.updateOne(
      { _id: user._id, active_reservations: mongoose.trusted({ $lt: max }) },
      { $inc: { active_reservations: 1 } },
      { session },
    );
    if (counted.modifiedCount === 0) {
      const current = await User.findById(user._id).session(session);
      throw new HttpError(
        409,
        'RESERVATION_LIMIT',
        `Ya tienes ${current?.active_reservations ?? max} reservas activas; el máximo es ${max}`,
      );
    }

    const [created] = await Reservation.create(
      [
        {
          user_id: user._id,
          book_id: book._id,
          store_id: store._id,
          book_title: book.title,
          store_name: store.name,
          store_address: store.address,
          price_cents: effectivePriceOf(storeBook, book),
          status: 'pending',
          expires_at: addDays(now, ENV.PENDING_TTL_DAYS),
        },
      ],
      { session },
    );
    return created;
  });
}

const isAdmin = (actor) => actor?.role === 'admin';

/**
 * Cambia el estado de una reserva. `actor` es el usuario que la pide, o null si es el sistema.
 * Solo el titular o un administrador pueden cancelar; las rutas limitan el resto a admin.
 */
export async function transition(reservationId, to, { actor = null } = {}) {
  let expiredNow = false;
  const updated = await runInTransaction(async (session) => {
    expiredNow = false;
    const now = new Date();
    const reservation = await Reservation.findById(reservationId).session(session);
    if (!reservation) throw notFound('Reserva no encontrada');

    const isOwner = actor != null && reservation.user_id.equals(actor._id);
    if (to === 'cancelled' && !isOwner && !isAdmin(actor)) {
      throw new HttpError(403, 'FORBIDDEN', 'No puedes cancelar la reserva de otra persona');
    }

    if (to === 'expired') {
      if (!isOverdue(reservation, now)) throw invalidTransition();
      return applyTransition(reservation, 'expired', { audited: true, now }, session);
    }
    // Una reserva vencida se caduca de verdad antes de responder (research R9). El error se
    // lanza fuera de la transacción para que la caducidad sí se confirme.
    if (isOverdue(reservation, now)) {
      await applyTransition(reservation, 'expired', { audited: true, now }, session);
      expiredNow = true;
      return null;
    }

    const reason = to === 'cancelled' ? (isOwner ? 'user' : 'admin') : undefined;
    return applyTransition(
      reservation,
      to,
      { actorId: actor?._id, audited: actor == null || isAdmin(actor), reason, now },
      session,
    );
  });
  if (expiredNow) throw invalidTransition('La reserva ha caducado');
  return updated;
}

/** "Mis reservas": las del usuario, de la más reciente a la más antigua. */
export async function listUserReservations(userId, { status, page, limit } = {}) {
  await runInTransaction((session) => expireOverdue({ user_id: userId }, session));
  const filter = { user_id: userId };
  if (status) filter.status = status;
  return paginate(Reservation, filter, { sort: LIST_SORT, page, limit });
}

/** Listado de administración, filtrable por estado y tienda, con los datos del usuario. */
export async function listAllReservations({ status, store_id: storeId, page, limit } = {}) {
  const scope = storeId ? { store_id: storeId } : {};
  await runInTransaction((session) => expireOverdue(scope, session));
  const filter = { ...scope };
  if (status) filter.status = status;
  return paginate(Reservation, filter, {
    sort: LIST_SORT,
    populate: { path: 'user_id', select: 'name email' },
    page,
    limit,
  });
}

const idOf = (value) => String(value?._id ?? value);

/** Reservation según contracts/rest-api.md; con user_id poblado añade `user`. No cambia el estado. */
export function toPublic(reservation) {
  const result = {
    id: idOf(reservation._id),
    book_id: idOf(reservation.book_id),
    store_id: idOf(reservation.store_id),
    book_title: reservation.book_title,
    store_name: reservation.store_name,
    store_address: reservation.store_address,
    price_cents: reservation.price_cents,
    status: reservation.status,
    cancel_reason: reservation.cancel_reason ?? null,
    created_at: reservation.created_at,
    ready_at: reservation.ready_at ?? null,
    expires_at: reservation.expires_at ?? null,
    closed_at: reservation.closed_at ?? null,
  };
  const user = reservation.user_id;
  if (user && typeof user === 'object' && 'email' in user) {
    result.user = { id: idOf(user._id), name: user.name, email: user.email };
  } else if (user === null) {
    // Poblado pero sin documento: la cuenta se borró (feature 002, research R6).
    result.user = null;
  }
  return result;
}
