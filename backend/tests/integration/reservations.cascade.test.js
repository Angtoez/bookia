import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { Reservation } from '../../src/models/Reservation.js';
import { StoreBook } from '../../src/models/StoreBook.js';
import { User } from '../../src/models/User.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import {
  createAdmin,
  createBook,
  createStore,
  createStoreBook,
  createUser,
  sessionCookieFor,
} from '../helpers/factories.js';

const app = createApp();
let adminCookie;

async function reserveAs(user, book, store) {
  const res = await request(app)
    .post('/api/reservations')
    .set('Cookie', sessionCookieFor(user))
    .send({ book_id: String(book._id), store_id: String(store._id) });
  expect(res.status).toBe(201);
  return res.body;
}

/** Un libro en dos tiendas, con dos usuarios que lo reservan en la primera. */
async function scenario() {
  const book = await createBook();
  const [store, other] = [await createStore(), await createStore()];
  await createStoreBook({ book_id: book._id, store_id: store._id, stock: 3 });
  await createStoreBook({ book_id: book._id, store_id: other._id, stock: 3 });
  const users = [await createUser(), await createUser()];
  for (const u of users) await reserveAs(u, book, store);
  return { book, store, other, users };
}

const reasons = async (filter) => (await Reservation.find(filter)).map((r) => r.cancel_reason);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  adminCookie = sessionCookieFor(await createAdmin());
});

describe('bajas en cascada', () => {
  it('borrar un libro cancela sus reservas activas y libera los cupos', async () => {
    const { book, users } = await scenario();
    const impact = await request(app)
      .get(`/api/books/${book._id}/deletionImpact`)
      .set('Cookie', adminCookie);
    expect(impact.body).toMatchObject({ stores: 2, active_reservations: 2 });

    const res = await request(app).delete(`/api/books/${book._id}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);
    expect(await reasons({ book_id: book._id })).toEqual(['book_deleted', 'book_deleted']);
    expect(await Reservation.countDocuments({ is_active: true })).toBe(0);
    for (const u of users) expect((await User.findById(u._id)).active_reservations).toBe(0);
    expect(await AuditLog.countDocuments({ entity_type: 'reservation' })).toBe(2);
    expect(await StoreBook.countDocuments({ book_id: book._id })).toBe(0);
  });

  it('borrar una tienda cancela sus reservas activas con store_deleted', async () => {
    const { store, other, users } = await scenario();
    const impact = await request(app)
      .get(`/api/stores/${store._id}/deletionImpact`)
      .set('Cookie', adminCookie);
    expect(impact.body).toEqual({ books: 1, active_reservations: 2 });

    const res = await request(app).delete(`/api/stores/${store._id}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);
    expect(await reasons({ store_id: store._id })).toEqual(['store_deleted', 'store_deleted']);
    for (const u of users) expect((await User.findById(u._id)).active_reservations).toBe(0);
    // La otra tienda no se toca.
    expect((await StoreBook.findOne({ store_id: other._id })).reserved_count).toBe(0);
  });

  it('las reservas conservan sus copias aunque cambien o desaparezcan el libro y la tienda', async () => {
    const book = await createBook({ title: 'Pedro Páramo' });
    const store = await createStore({ name: 'Librería Centro' });
    await createStoreBook({
      book_id: book._id,
      store_id: store._id,
      stock: 2,
      store_price_cents: 15000,
    });
    const user = await createUser();
    const created = await reserveAs(user, book, store);
    await request(app)
      .patch(`/api/stores/${store._id}/books/${book._id}`)
      .set('Cookie', adminCookie)
      .send({ store_price_cents: 99000 });
    await request(app).delete(`/api/stores/${store._id}`).set('Cookie', adminCookie);
    await request(app).delete(`/api/books/${book._id}`).set('Cookie', adminCookie);

    const mine = await request(app)
      .get('/api/reservations/mine')
      .set('Cookie', sessionCookieFor(user));
    expect(mine.body.items[0]).toMatchObject({
      id: created.id,
      book_title: 'Pedro Páramo',
      store_name: 'Librería Centro',
      store_address: store.address,
      price_cents: 15000,
      status: 'cancelled',
      cancel_reason: 'store_deleted',
    });
  });
});
