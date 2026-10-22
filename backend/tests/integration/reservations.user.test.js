import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { StoreBook } from '../../src/models/StoreBook.js';
import { User } from '../../src/models/User.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import {
  createBook,
  createStore,
  createStoreBook,
  createUser,
  sessionCookieFor,
} from '../helpers/factories.js';

const app = createApp();
const DAY_MS = 24 * 60 * 60 * 1000;
let user;
let cookie;

const reserve = (body, as = cookie) =>
  request(app).post('/api/reservations').set('Cookie', as).send(body);

async function stocked(stock = 3, extra = {}) {
  const book = await createBook();
  const store = await createStore();
  await createStoreBook({ book_id: book._id, store_id: store._id, stock, ...extra });
  return { book_id: String(book._id), store_id: String(store._id), book, store };
}

const availableIn = async (bookId, storeId) => {
  const detail = await request(app).get(`/api/books/${bookId}`);
  return detail.body.stores.find((s) => s.store_id === storeId);
};

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  user = await createUser();
  cookie = sessionCookieFor(user);
});

describe('reservar', () => {
  it('crea la reserva pending a 7 días y reduce las unidades disponibles', async () => {
    const { book_id, store_id, book, store } = await stocked(3, { store_price_cents: 18000 });
    const res = await reserve({ book_id, store_id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      book_id,
      store_id,
      book_title: book.title,
      store_name: store.name,
      store_address: store.address,
      price_cents: 18000,
      status: 'pending',
      cancel_reason: null,
      ready_at: null,
      closed_at: null,
    });
    const days = (new Date(res.body.expires_at) - new Date(res.body.created_at)) / DAY_MS;
    expect(days).toBeCloseTo(7, 3);
    expect((await availableIn(book_id, store_id)).available).toBe(2);
    expect((await User.findById(user._id)).active_reservations).toBe(1);
  });

  it('rechaza una tienda agotada', async () => {
    const ids = await stocked(0);
    const res = await reserve(ids);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OUT_OF_STOCK');
  });

  it('rechaza una segunda reserva activa del mismo libro en la misma tienda', async () => {
    const ids = await stocked(1);
    await reserve(ids);
    const res = await reserve(ids);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_RESERVATION');
  });

  it('impide la 6.ª reserva activa e indica cuántas hay y el máximo', async () => {
    for (let i = 0; i < 5; i += 1) expect((await reserve(await stocked())).status).toBe(201);
    const ids = await stocked();
    const res = await reserve(ids);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'RESERVATION_LIMIT',
      message: 'Ya tienes 5 reservas activas; el máximo es 5',
    });
    const sb = await StoreBook.findOne({ book_id: ids.book_id });
    expect(sb.reserved_count).toBe(0);
  });

  it('responde 404 si el libro no está en esa tienda', async () => {
    const book = await createBook();
    const store = await createStore();
    const res = await reserve({ book_id: String(book._id), store_id: String(store._id) });
    expect(res.status).toBe(404);
  });

  it('exige sesión y valida los ids', async () => {
    const ids = await stocked();
    expect((await request(app).post('/api/reservations').send(ids)).status).toBe(401);
    expect((await request(app).get('/api/reservations/mine')).status).toBe(401);
    const bad = await reserve({ book_id: 'x', store_id: ids.store_id });
    expect(bad.status).toBe(400);
  });
});

describe('mis reservas', () => {
  it('lista solo las propias, de la más reciente a la más antigua', async () => {
    const first = await reserve(await stocked());
    const second = await reserve(await stocked());
    const other = await createUser();
    await reserve(await stocked(), sessionCookieFor(other));
    const res = await request(app).get('/api/reservations/mine').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((r) => r.id)).toEqual([second.body.id, first.body.id]);
    const filtered = await request(app)
      .get('/api/reservations/mine?status=cancelled')
      .set('Cookie', cookie);
    expect(filtered.body.total).toBe(0);
  });

  it('cancela la propia y libera la unidad; una segunda vez es INVALID_TRANSITION', async () => {
    const ids = await stocked(1);
    const created = await reserve(ids);
    const res = await request(app)
      .post(`/api/reservations/${created.body.id}/cancel`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'cancelled', cancel_reason: 'user' });
    expect(res.body.closed_at).not.toBeNull();
    expect((await availableIn(ids.book_id, ids.store_id)).available).toBe(1);
    expect((await User.findById(user._id)).active_reservations).toBe(0);

    const again = await request(app)
      .post(`/api/reservations/${created.body.id}/cancel`)
      .set('Cookie', cookie);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('no deja cancelar la reserva de otro usuario', async () => {
    const created = await reserve(await stocked());
    const other = sessionCookieFor(await createUser());
    const res = await request(app)
      .post(`/api/reservations/${created.body.id}/cancel`)
      .set('Cookie', other);
    expect(res.status).toBe(403);
  });
});
