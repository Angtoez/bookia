// SC-009: nunca hay más reservas activas que stock, aunque lleguen a la vez.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { Reservation } from '../../src/models/Reservation.js';
import { StoreBook } from '../../src/models/StoreBook.js';
import { startDb, stopDb } from '../helpers/db.js';
import {
  createBook,
  createStore,
  createStoreBook,
  createUser,
  sessionCookieFor,
} from '../helpers/factories.js';

const app = createApp();
const USERS = 20;

beforeAll(startDb);
afterAll(stopDb);

describe('concurrencia', () => {
  it('con stock 1 y 20 usuarios simultáneos, solo uno consigue la reserva', async () => {
    const book = await createBook();
    const store = await createStore();
    await createStoreBook({ book_id: book._id, store_id: store._id, stock: 1 });
    const users = await Promise.all(Array.from({ length: USERS }, () => createUser()));
    const body = { book_id: String(book._id), store_id: String(store._id) };

    const responses = await Promise.all(
      users.map((u) =>
        request(app).post('/api/reservations').set('Cookie', sessionCookieFor(u)).send(body),
      ),
    );

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    const rejected = responses.filter((r) => r.status !== 201);
    expect(rejected).toHaveLength(USERS - 1);
    for (const r of rejected) expect(r.body.error.code).toBe('OUT_OF_STOCK');

    const sb = await StoreBook.findOne({ book_id: book._id });
    expect(sb.reserved_count).toBe(1);
    expect(await Reservation.countDocuments({ is_active: true })).toBe(1);
  }, 120000);
});
