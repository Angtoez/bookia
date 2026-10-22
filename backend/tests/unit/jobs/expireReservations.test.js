// Job de caducidad contra la base de datos en memoria (research R9, SC-010).
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '../../../src/config/env.js';
import { runExpiration, startExpirationJob } from '../../../src/jobs/expireReservations.js';
import { AuditLog } from '../../../src/models/AuditLog.js';
import { Reservation } from '../../../src/models/Reservation.js';
import { StoreBook } from '../../../src/models/StoreBook.js';
import { User } from '../../../src/models/User.js';
import { createReservation, transition } from '../../../src/services/reservationService.js';
import { clearDb, startDb, stopDb } from '../../helpers/db.js';
import {
  createAdmin,
  createBook,
  createStore,
  createStoreBook,
  createUser,
} from '../../helpers/factories.js';

async function reserve(user) {
  const book = await createBook();
  const store = await createStore();
  await createStoreBook({ book_id: book._id, store_id: store._id, stock: 1 });
  return createReservation({ user, bookId: book._id, storeId: store._id });
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('runExpiration', () => {
  it('caduca las vencidas una sola vez aunque se ejecute dos veces', async () => {
    const user = await createUser();
    const overdue = await reserve(user);
    const ready = await reserve(user);
    const current = await reserve(user);
    await transition(ready._id, 'ready', { actor: await createAdmin() });
    const past = new Date(Date.now() - 1000);
    await Reservation.updateMany(
      { _id: mongoose.trusted({ $in: [overdue._id, ready._id] }) },
      { expires_at: past },
    );

    expect(await runExpiration()).toBe(2);
    expect(await runExpiration()).toBe(0);

    const statuses = await Promise.all(
      [overdue, ready, current].map(async (r) => (await Reservation.findById(r._id)).status),
    );
    expect(statuses).toEqual(['expired', 'expired', 'pending']);
    const expiredLogs = await AuditLog.find({ entity_type: 'reservation', user_id: null });
    expect(expiredLogs).toHaveLength(2);
    expect((await User.findById(user._id)).active_reservations).toBe(1);
    const counts = (await StoreBook.find().sort({ created_at: 1 })).map((sb) => sb.reserved_count);
    expect(counts).toEqual([0, 0, 1]);
  });
});

describe('startExpirationJob', () => {
  it('programa la caducidad periódica y se puede parar', () => {
    vi.useFakeTimers();
    try {
      const stop = startExpirationJob();
      expect(vi.getTimerCount()).toBe(1);
      stop();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('en cada intervalo caduca las reservas vencidas', async () => {
    const r = await reserve(await createUser());
    await Reservation.updateOne({ _id: r._id }, { expires_at: new Date(Date.now() - 1000) });
    // Solo se falsea setInterval: el driver de MongoDB sigue usando los temporizadores reales.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const stop = startExpirationJob();
    try {
      vi.advanceTimersByTime(ENV.EXPIRATION_INTERVAL_MS);
      await vi.waitFor(async () => {
        expect((await Reservation.findById(r._id)).status).toBe('expired');
      });
    } finally {
      stop();
      vi.useRealTimers();
    }
  });
});
