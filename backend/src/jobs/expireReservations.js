// Job en proceso que caduca las reservas vencidas cada EXPIRATION_INTERVAL_MS (research R9).
// Es idempotente: si dos instancias caducan la misma reserva, solo una transición prospera.
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { Reservation } from '../models/Reservation.js';
import { transition } from '../services/reservationService.js';

const BATCH_SIZE = 100;

/** Caduca las reservas activas con expires_at <= now. Devuelve cuántas ha caducado. */
export async function runExpiration(now = new Date()) {
  let expired = 0;
  for (;;) {
    const batch = await Reservation.find({
      is_active: true,
      expires_at: mongoose.trusted({ $lte: now }),
    })
      .select('_id')
      .limit(BATCH_SIZE)
      .lean();
    let changed = 0;
    for (const { _id } of batch) {
      try {
        await transition(_id, 'expired');
        changed += 1;
      } catch (err) {
        // Otra petición o instancia ya la cerró: no hay nada que hacer.
        if (err.code !== 'INVALID_TRANSITION') throw err;
      }
    }
    expired += changed;
    // Sin avances, el siguiente lote sería el mismo.
    if (batch.length < BATCH_SIZE || changed === 0) return expired;
  }
}

/** Arranca el job y devuelve la función que lo para. */
export function startExpirationJob() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await runExpiration();
    } catch (err) {
      console.error(`Error al caducar reservas: ${err.message}`);
    } finally {
      running = false;
    }
  }, ENV.EXPIRATION_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
