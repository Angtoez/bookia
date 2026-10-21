import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { Book } from '../../src/models/Book.js';
import { StoreBook } from '../../src/models/StoreBook.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import {
  createAdmin,
  createBook,
  createStore,
  createStoreBook,
  createUser,
  loginAs,
} from '../helpers/factories.js';

const app = createApp();
let cookie;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  cookie = await loginAs(app, await createAdmin());
});

const store = {
  name: 'Librería Centro (demo)',
  address: 'Calle de ejemplo 1, Huauchinango, Puebla',
  opening_hours: 'L–V 9:00–20:00',
  phone: '776 000 0001',
};

describe('puntos de venta', () => {
  it('CRUD completo con auditoría', async () => {
    const created = await request(app).post('/api/stores').set('Cookie', cookie).send(store);
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(String), ...store });
    const id = created.body.id;

    const got = await request(app).get(`/api/stores/${id}`).set('Cookie', cookie);
    expect(got.body.name).toBe(store.name);

    const patched = await request(app)
      .patch(`/api/stores/${id}`)
      .set('Cookie', cookie)
      .send({ phone: '' });
    expect(patched.body.phone).toBeNull();

    const deleted = await request(app).delete(`/api/stores/${id}`).set('Cookie', cookie);
    expect(deleted.status).toBe(204);
    expect((await request(app).get(`/api/stores/${id}`).set('Cookie', cookie)).status).toBe(404);

    const actions = (await AuditLog.find({ entity_type: 'store' }).sort({ created_at: 1 })).map(
      (l) => l.action,
    );
    expect(actions).toEqual(['create', 'update', 'delete']);
  });

  it('valida los obligatorios y el teléfono', async () => {
    const res = await request(app)
      .post('/api/stores')
      .set('Cookie', cookie)
      .send({ name: '', phone: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual([
      'address',
      'name',
      'opening_hours',
      'phone',
    ]);
  });

  it('lista paginado y ordenado por nombre', async () => {
    await createStore({ name: 'Zeta' });
    await createStore({ name: 'Alfa' });
    const res = await request(app).get('/api/stores?limit=1').set('Cookie', cookie);
    expect(res.body).toMatchObject({ total: 2, total_pages: 2 });
    expect(res.body.items[0].name).toBe('Alfa');
  });

  it('al borrarla quita sus asociaciones pero conserva los libros', async () => {
    const s = await createStore();
    const book = await createBook();
    await createStoreBook({ store_id: s._id, book_id: book._id });
    const impact = await request(app)
      .get(`/api/stores/${s._id}/deletionImpact`)
      .set('Cookie', cookie);
    expect(impact.body).toEqual({ books: 1, active_reservations: 0 });
    await request(app).delete(`/api/stores/${s._id}`).set('Cookie', cookie);
    expect(await StoreBook.countDocuments()).toBe(0);
    expect(await Book.exists({ _id: book._id })).toBeTruthy();
  });

  it('todas las rutas exigen administrador', async () => {
    const userCookie = await loginAs(app, await createUser());
    expect((await request(app).get('/api/stores')).status).toBe(401);
    expect((await request(app).get('/api/stores').set('Cookie', userCookie)).status).toBe(403);
    const post = await request(app).post('/api/stores').set('Cookie', userCookie).send(store);
    expect(post.status).toBe(403);
  });
});

describe('inventario por punto de venta', () => {
  let s;
  let book;

  beforeEach(async () => {
    s = await createStore();
    book = await createBook({ price_cents: 20000 });
  });

  const base = () => `/api/stores/${s._id}/books`;

  it('asocia con stock y precio propio y se refleja en el detalle público', async () => {
    const res = await request(app)
      .post(base())
      .set('Cookie', cookie)
      .send({ book_id: String(book._id), stock: 5, store_price_cents: 18500 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ stock: 5, available: 5, effective_price_cents: 18500 });
    const detail = await request(app).get(`/api/books/${book._id}`);
    expect(detail.body.stores[0]).toMatchObject({ price_cents: 18500, available: 5 });
  });

  it('sin precio propio usa el de referencia y no permite duplicados', async () => {
    const body = { book_id: String(book._id), stock: 2 };
    const first = await request(app).post(base()).set('Cookie', cookie).send(body);
    expect(first.body.effective_price_cents).toBe(20000);
    const dup = await request(app).post(base()).set('Cookie', cookie).send(body);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_ASSOCIATED');
  });

  it('lista el inventario ordenado por título', async () => {
    const other = await createBook({ title: 'Alfa' });
    await createStoreBook({ store_id: s._id, book_id: book._id });
    await createStoreBook({ store_id: s._id, book_id: other._id });
    const res = await request(app).get(base()).set('Cookie', cookie);
    expect(res.body.total).toBe(2);
    expect(res.body.items[0].title).toBe('Alfa');
  });

  it('actualiza stock y quita el precio propio con null', async () => {
    await createStoreBook({ store_id: s._id, book_id: book._id, store_price_cents: 100 });
    const res = await request(app)
      .patch(`${base()}/${book._id}`)
      .set('Cookie', cookie)
      .send({ stock: 8, store_price_cents: null });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      stock: 8,
      store_price_cents: null,
      effective_price_cents: 20000,
    });
    const log = await AuditLog.findOne({ entity_type: 'store_book', action: 'update' }).lean();
    expect(log.before.stock).toBe(5);
    expect(log.after.stock).toBe(8);
  });

  it('impide bajar el stock por debajo de lo reservado y desasociar con reservas', async () => {
    await createStoreBook({ store_id: s._id, book_id: book._id, stock: 3, reserved_count: 2 });
    const patch = await request(app)
      .patch(`${base()}/${book._id}`)
      .set('Cookie', cookie)
      .send({ stock: 1 });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toMatchObject({ code: 'STOCK_BELOW_RESERVED' });
    expect(patch.body.error.message).toContain('2 unidades reservadas');
    const del = await request(app).delete(`${base()}/${book._id}`).set('Cookie', cookie);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('HAS_ACTIVE_RESERVATIONS');
  });

  it('desasocia y audita; 404 si no existe la asociación', async () => {
    await createStoreBook({ store_id: s._id, book_id: book._id });
    expect((await request(app).delete(`${base()}/${book._id}`).set('Cookie', cookie)).status).toBe(
      204,
    );
    expect((await request(app).delete(`${base()}/${book._id}`).set('Cookie', cookie)).status).toBe(
      404,
    );
    expect(await AuditLog.countDocuments({ entity_type: 'store_book', action: 'delete' })).toBe(1);
  });

  it('404 si la tienda o el libro no existen', async () => {
    const missing = '64b000000000000000000000';
    const noBook = await request(app)
      .post(base())
      .set('Cookie', cookie)
      .send({ book_id: missing, stock: 1 });
    expect(noBook.status).toBe(404);
    const noStore = await request(app).get(`/api/stores/${missing}/books`).set('Cookie', cookie);
    expect(noStore.status).toBe(404);
  });
});

describe('audit_logs', () => {
  it('es inmutable desde la aplicación', async () => {
    await request(app).post('/api/stores').set('Cookie', cookie).send(store);
    await expect(AuditLog.updateMany({}, { entity_label: 'x' })).rejects.toThrow('inmutable');
    await expect(AuditLog.deleteMany({})).rejects.toThrow('inmutable');
    const log = await AuditLog.findOne();
    log.entity_label = 'x';
    await expect(log.save()).rejects.toThrow('inmutable');
  });
});
