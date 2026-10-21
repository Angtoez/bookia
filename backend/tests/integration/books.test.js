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
  createGenre,
  createStore,
  createStoreBook,
  createUser,
  loginAs,
} from '../helpers/factories.js';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('catálogo público', () => {
  let novela;
  let cien;

  beforeEach(async () => {
    novela = await createGenre({ name: 'Novela', slug: 'novela' });
    const poesia = await createGenre({ name: 'Poesía', slug: 'poesia' });
    cien = await createBook({
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      genre_id: novela._id,
    });
    await createBook({ title: 'Pedro Páramo', author: 'Juan Rulfo', genre_id: novela._id });
    await createBook({ title: 'Cien sonetos', author: 'Pablo Neruda', genre_id: poesia._id });
  });

  it('lista paginado y ordenado por título', async () => {
    const res = await request(app).get('/api/books?limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3, total_pages: 2 });
    expect(res.body.items.map((b) => b.title)).toEqual(['Cien años de soledad', 'Cien sonetos']);
    expect(res.body.items[0].genre).toMatchObject({ name: 'Novela', slug: 'novela' });
  });

  it('busca por título sin mayúsculas ni tildes', async () => {
    for (const q of ['CIEN AÑOS', 'cien anos']) {
      const res = await request(app).get('/api/books').query({ q });
      expect(res.body.items.map((b) => b.title)).toEqual(['Cien años de soledad']);
    }
  });

  it('busca por autor', async () => {
    const res = await request(app).get('/api/books').query({ q: 'garcia marq' });
    expect(res.body.items.map((b) => b.title)).toEqual(['Cien años de soledad']);
  });

  it('combina el filtro por género con la búsqueda', async () => {
    const res = await request(app).get('/api/books').query({ q: 'cien', genre: 'poesia' });
    expect(res.body.items.map((b) => b.title)).toEqual(['Cien sonetos']);
    const none = await request(app).get('/api/books').query({ genre: 'inexistente' });
    expect(none.body).toMatchObject({ items: [], total: 0 });
  });

  it('trata los caracteres especiales como texto literal', async () => {
    const res = await request(app).get('/api/books').query({ q: '.*(' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('no interpreta operadores de MongoDB en la query', async () => {
    // Express 5 no anida claves (q[$ne] es una clave literal) y zod descarta las desconocidas.
    const res = await request(app).get('/api/books?q[$ne]=x&genre[$ne]=x');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
  });

  it('muestra el detalle con las tiendas, el precio efectivo y el agotado', async () => {
    const a = await createStore({ name: 'Alfa' });
    const b = await createStore({ name: 'Beta' });
    await createStoreBook({
      store_id: a._id,
      book_id: cien._id,
      stock: 5,
      store_price_cents: 18500,
    });
    await createStoreBook({ store_id: b._id, book_id: cien._id, stock: 0 });
    const res = await request(app).get(`/api/books/${cien._id}`);
    expect(res.status).toBe(200);
    expect(res.body.stores).toEqual([
      expect.objectContaining({
        name: 'Alfa',
        price_cents: 18500,
        available: 5,
        is_sold_out: false,
      }),
      expect.objectContaining({
        name: 'Beta',
        price_cents: 20000,
        available: 0,
        is_sold_out: true,
      }),
    ]);
  });

  it('un libro sin tiendas devuelve stores vacío; 404 y 400 en ids', async () => {
    expect((await request(app).get(`/api/books/${cien._id}`)).body.stores).toEqual([]);
    expect((await request(app).get('/api/books/64b000000000000000000000')).status).toBe(404);
    expect((await request(app).get('/api/books/no-es-un-id')).status).toBe(400);
  });
});

describe('gestión de libros (admin)', () => {
  let adminCookie;
  let genre;
  const validBook = () => ({
    title: 'Rayuela',
    author: 'Julio Cortázar',
    genre_id: String(genre._id),
    isbn: '978-84-376-0457-2',
    price_cents: 29900,
  });

  beforeEach(async () => {
    genre = await createGenre({ name: 'Novela', slug: 'novela' });
    adminCookie = await loginAs(app, await createAdmin());
  });

  it('crea, edita y borra con tres entradas de auditoría', async () => {
    const created = await request(app)
      .post('/api/books')
      .set('Cookie', adminCookie)
      .send(validBook());
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ isbn: '9788437604572', stores: [] });
    const id = created.body.id;

    const updated = await request(app)
      .patch(`/api/books/${id}`)
      .set('Cookie', adminCookie)
      .send({ title: 'Rayuela (edición conmemorativa)' });
    expect(updated.status).toBe(200);
    expect((await Book.findById(id)).title_search).toBe('rayuela (edicion conmemorativa)');

    const store = await createStore();
    await createStoreBook({ store_id: store._id, book_id: id });
    const impact = await request(app)
      .get(`/api/books/${id}/deletionImpact`)
      .set('Cookie', adminCookie);
    expect(impact.body).toEqual({ stores: 1, active_reservations: 0, favorites: 0 });

    const deleted = await request(app).delete(`/api/books/${id}`).set('Cookie', adminCookie);
    expect(deleted.status).toBe(204);
    expect(await StoreBook.countDocuments({ book_id: id })).toBe(0);

    const logs = await AuditLog.find({ entity_type: 'book' }).sort({ created_at: 1 }).lean();
    expect(logs.map((l) => l.action)).toEqual(['create', 'update', 'delete']);
    expect(logs[1].before.title).toBe('Rayuela');
    expect(logs[1].after.title).toBe('Rayuela (edición conmemorativa)');
    expect(logs[0].after).not.toHaveProperty('title_search');
    expect(await AuditLog.countDocuments({ entity_type: 'store_book', action: 'delete' })).toBe(1);
  });

  it('rechaza un ISBN repetido aunque lleve guiones', async () => {
    await request(app).post('/api/books').set('Cookie', adminCookie).send(validBook());
    const res = await request(app)
      .post('/api/books')
      .set('Cookie', adminCookie)
      .send({ ...validBook(), isbn: '9788437604572' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ISBN_TAKEN');
    expect(await AuditLog.countDocuments()).toBe(1);
  });

  it('indica los campos inválidos y no guarda nada', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Cookie', adminCookie)
      .send({ ...validBook(), isbn: '123', price_cents: -1.5 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['isbn', 'price_cents']);
    const unknownGenre = await request(app)
      .post('/api/books')
      .set('Cookie', adminCookie)
      .send({ ...validBook(), genre_id: '64b000000000000000000000' });
    expect(unknownGenre.body.error.details).toEqual([
      { field: 'genre_id', message: 'El género no existe' },
    ]);
    expect(await Book.countDocuments()).toBe(0);
  });

  it('PATCH y DELETE de un libro inexistente dan 404', async () => {
    const id = '64b000000000000000000000';
    const patch = await request(app)
      .patch(`/api/books/${id}`)
      .set('Cookie', adminCookie)
      .send({ price_cents: 1 });
    expect(patch.status).toBe(404);
    expect((await request(app).delete(`/api/books/${id}`).set('Cookie', adminCookie)).status).toBe(
      404,
    );
  });

  it('impide la gestión a usuarios normales (403) y a anónimos (401)', async () => {
    const userCookie = await loginAs(app, await createUser());
    const book = await createBook({ genre_id: genre._id });
    const calls = [
      (r) => r.post('/api/books').send(validBook()),
      (r) => r.patch(`/api/books/${book._id}`).send({ price_cents: 1 }),
      (r) => r.delete(`/api/books/${book._id}`),
      (r) => r.get(`/api/books/${book._id}/deletionImpact`),
    ];
    for (const call of calls) {
      expect((await call(request(app))).status).toBe(401);
      const asUser = call(request(app));
      expect((await asUser.set('Cookie', userCookie)).status).toBe(403);
    }
  });
});
