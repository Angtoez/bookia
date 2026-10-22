// Transiciones de estado de las reservas y su efecto en los contadores
// (data-model § Transiciones de estado, research R8 y R9). Todo se ejecuta dentro de la
// sesión de la transacción que recibe cada función.
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { Reservation } from '../models/Reservation.js';
import { StoreBook } from '../models/StoreBook.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { record } from './auditService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Estados de origen permitidos para cada estado de destino. */
export const TRANSITIONS = Object.freeze({
  ready: ['pending'],
  picked_up: ['ready'],
  cancelled: ['pending', 'ready'],
  expired: ['pending', 'ready'],
});

export const canTransition = (from, to) => Boolean(TRANSITIONS[to]?.includes(from));

export const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

export const isOverdue = (reservation, now) =>
  reservation.is_active && reservation.expires_at != null && reservation.expires_at <= now;

export const invalidTransition = (message = 'La reserva no admite ese cambio de estado') =>
  new HttpError(409, 'INVALID_TRANSITION', message);

function changesFor(to, { now, reason }) {
  if (to === 'ready') {
    return { status: 'ready', ready_at: now, expires_at: addDays(now, ENV.PICKUP_TTL_DAYS) };
  }
  return {
    status: to,
    is_active: false,
    expires_at: null,
    closed_at: now,
    cancel_reason: to === 'cancelled' ? reason : null,
  };
}

/** Devuelve la unidad al StoreBook (o la descuenta del stock si se recoge) y libera el cupo. */
async function releaseCounters(reservation, to, session) {
  const inc = to === 'picked_up' ? { stock: -1, reserved_count: -1 } : { reserved_count: -1 };
  // Si la tienda o el libro ya se borraron, el StoreBook no existe y no hay nada que liberar.
  await StoreBook.updateOne(
    {
      store_id: reservation.store_id,
      book_id: reservation.book_id,
      reserved_count: mongoose.trusted({ $gte: 1 }),
    },
    { $inc: inc },
    { session },
  );
  await User.updateOne(
    { _id: reservation.user_id, active_reservations: mongoose.trusted({ $gte: 1 }) },
    { $inc: { active_reservations: -1 } },
    { session },
  );
}

/**
 * Aplica una transición con una actualización condicional sobre el estado de origen, así que
 * es idempotente frente a peticiones repetidas y frente al job de caducidad.
 * @param {object} reservation documento cargado en la misma sesión.
 * @param {'ready'|'picked_up'|'cancelled'|'expired'} to
 * @param {{actorId?: any, audited: boolean, reason?: string, now: Date}} options
 */
export async function applyTransition(reservation, to, options, session) {
  if (!canTransition(reservation.status, to)) throw invalidTransition();
  const updated = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: reservation.status },
    { $set: changesFor(to, options) },
    { new: true, session },
  );
  if (!updated) throw invalidTransition();
  if (to !== 'ready') await releaseCounters(reservation, to, session);
  // Las transiciones del administrador y del sistema se auditan (FR-027).
  if (options.audited) {
    await record(
      {
        userId: options.actorId ?? null,
        action: 'status_change',
        entityType: 'reservation',
        entityId: reservation._id,
        entityLabel: reservation.book_title,
        before: reservation,
        after: updated,
      },
      session,
    );
  }
  return updated;
}

/** Caduca las reservas activas vencidas que cumplen el filtro (research R9). */
export async function expireOverdue(filter, session, now = new Date()) {
  const overdue = await Reservation.find({
    ...filter,
    is_active: true,
    expires_at: mongoose.trusted({ $lte: now }),
  }).session(session);
  for (const reservation of overdue) {
    await applyTransition(reservation, 'expired', { audited: true, now }, session);
  }
  return overdue.length;
}

/** Cancela las reservas activas que cumplen el filtro; lo usan las bajas en cascada (FR-022f). */
export async function cancelActiveFor(filter, reason, actorId, session, now = new Date()) {
  const active = await Reservation.find({ ...filter, is_active: true }).session(session);
  for (const reservation of active) {
    await applyTransition(
      reservation,
      'cancelled',
      { actorId, audited: true, reason, now },
      session,
    );
  }
  return active.length;
}
