// Rendimiento con volumen (T129, principio IV): 10 000 libros, 500 tiendas, 200 usuarios y
// 5 000 reservas. Comprueba que las consultas del catálogo usan índices (sin COLLSCAN) y que las
// rutas principales responden en menos de 200 ms (mediana de 10 peticiones).
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { buildBookFilter } from '../../src/controllers/booksController.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { Book } from '../../src/models/Book.js';
import { Reservation } from '../../src/models/Reservation.js';
import { Store } from '../../src/models/Store.js';
import { StoreBook } from '../../src/models/StoreBook.js';
import { User } from '../../src/models/User.js';
import { normalizeSearch } from '../../src/utils/normalizeSearch.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import { createAdmin, createGenre, makeIsbn, sessionCookieFor } from '../helpers/factories.js';

const app = createApp();
const LIMIT_MS = 200;
const BOOKS = 10_000;
const STORES = 500;
const USERS = 200;
const RESERVATIONS = 5_000;

let genres;
let books;
let stores;
let users;
let adminCookie;

const oid = () => new mongoose.Types.ObjectId();

async function insertInChunks(model, docs, size = 2_000) {
  for (let i = 0; i < docs.length; i += size) {
    // El driver directamente: el volumen importa más que las validaciones de Mongoose aquí.
    await model.collection.insertMany(docs.slice(i, i + size), { ordered: false });
  }
}

/** Mediana en ms de `times` ejecuciones de `send` (tras una de calentamiento). */
async function median(send, times = 10) {
  await send();
  const durations = [];
  for (let i = 0; i < times; i += 1) {
    const start = performance.now();
    const res = await send(i);
    durations.push(performance.now() - start);
    expect(res.status).toBeLessThan(400);
  }
  durations.sort((a, b) => a - b);
  return (durations[4] + durations[5]) / 2;
}

/** Etapas de un plan de explain(), aplanadas. */
function stagesOf(plan) {
  const stages = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.stage) stages.push(node.stage);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (typeof value === 'object') walk(value);
    }
  };
  walk(plan.queryPlanner?.winningPlan ?? plan);
  return stages;
}

beforeAll(async () => {
  await startDb();
  await clearDb();
  genres = await Promise.all(Array.from({ length: 10 }, () => createGenre()));

  books = Array.from({ length: BOOKS }, (_, i) => {
    const title = `Libro de prueba ${i}`;
    const author = `Autora ${i % 700}`;
    return {
      _id: oid(),
      title,
      author,
      title_search: normalizeSearch(title),
      author_search: normalizeSearch(author),
      isbn: makeIsbn(500_000 + i),
      price_cents: 19_900,
      genre_id: genres[i % genres.length]._id,
      description: null,
      publisher: null,
      publication_year: null,
    };
  });
  await insertInChunks(Book, books);

  stores = Array.from({ length: STORES }, (_, i) => ({
    _id: oid(),
    name: `Tienda ${i}`,
    address: `Calle ${i}, Huauchinango, Puebla`,
    opening_hours: 'L–V 9:00–19:00',
    phone: null,
  }));
  await insertInChunks(Store, stores);

  // Cada libro, en dos tiendas, con mucho stock para poder reservar.
  const storeBooks = books.flatMap((book, i) =>
    [0, 1].map((k) => ({
      _id: oid(),
      book_id: book._id,
      store_id: stores[(i + k * 7) % STORES]._id,
      stock: 1_000,
      reserved_count: 0,
      store_price_cents: null,
    })),
  );
  await insertInChunks(StoreBook, storeBooks);

  users = Array.from({ length: USERS }, (_, i) => ({
    _id: oid(),
    name: `Lectora ${i}`,
    email: `lectora${i}@example.com`,
    password_hash: 'x',
    role: 'user',
    status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
  }));
  await insertInChunks(User, users);

  // 25 reservas por usuario: dos activas y el resto ya terminadas.
  const now = Date.now();
  const reservations = Array.from({ length: RESERVATIONS }, (_, i) => {
    const user = users[i % USERS];
    const book = books[i];
    const active = Math.floor(i / USERS) < 2;
    return {
      _id: oid(),
      user_id: user._id,
      book_id: book._id,
      store_id: stores[i % STORES]._id,
      book_title: book.title,
      store_name: stores[i % STORES].name,
      store_address: stores[i % STORES].address,
      price_cents: 19_900,
      status: active ? 'pending' : 'picked_up',
      is_active: active,
      expires_at: active ? new Date(now + 7 * 86_400_000) : null,
      ready_at: null,
      cancel_reason: null,
      created_at: new Date(now - i * 60_000),
      updated_at: new Date(now - i * 60_000),
    };
  });
  await insertInChunks(Reservation, reservations);

  const audit = Array.from({ length: RESERVATIONS }, (_, i) => ({
    _id: oid(),
    user_id: null,
    action: 'update',
    entity_type: 'book',
    entity_id: books[i]._id,
    entity_label: books[i].title,
    before: null,
    after: null,
    created_at: new Date(now - i * 1_000),
  }));
  await insertInChunks(AuditLog, audit);

  adminCookie = sessionCookieFor(await createAdmin());
});
afterAll(stopDb);

it('carga el volumen completo (si no, los tiempos no significarían nada)', async () => {
  expect(await Book.countDocuments()).toBe(BOOKS);
  expect(await Store.countDocuments()).toBe(STORES);
  expect(await Reservation.countDocuments()).toBe(RESERVATIONS);
  const res = await request(app).get('/api/books?q=prueba');
  expect(res.body.total).toBe(BOOKS);
});

describe('índices del catálogo', () => {
  const plan = (filter) =>
    Book.find(filter).sort({ title_search: 1, _id: 1 }).limit(20).explain('executionStats');

  it.each([
    ['con q', { q: 'prueba 42' }],
    ['con genre', { genreId: 'GENRE' }],
    ['con q y genre', { q: 'prueba 42', genreId: 'GENRE' }],
  ])('listBooks %s no usa COLLSCAN', async (_label, params) => {
    const filter = buildBookFilter({
      q: params.q,
      genreId: params.genreId ? genres[0]._id : undefined,
    });
    const stages = stagesOf(await plan(filter));
    expect(stages).not.toContain('COLLSCAN');
  });

  it('el detalle (libro y sus tiendas) no usa COLLSCAN', async () => {
    const book = books[1234];
    expect(stagesOf(await Book.findById(book._id).explain('executionStats'))).not.toContain(
      'COLLSCAN',
    );
    const storeBooksPlan = await StoreBook.find({ book_id: book._id }).explain('executionStats');
    expect(stagesOf(storeBooksPlan)).not.toContain('COLLSCAN');
  });
});

describe(`tiempos de respuesta (mediana de 10, < ${LIMIT_MS} ms)`, () => {
  it('GET /api/books?q= y GET /api/books/:id', async () => {
    const list = await median(() => request(app).get('/api/books?q=prueba%2042'));
    const detail = await median((i = 0) => request(app).get(`/api/books/${books[i * 97]._id}`));
    console.info(
      `[rendimiento] listado con q: ${list.toFixed(1)} ms; detalle: ${detail.toFixed(1)} ms`,
    );
    expect(list).toBeLessThan(LIMIT_MS);
    expect(detail).toBeLessThan(LIMIT_MS);
  });

  it('POST /api/reservations', async () => {
    // Usuarios nuevos, sin reservas activas: cada petición crea una reserva distinta.
    const fresh = await Promise.all(
      Array.from({ length: 11 }, (_, i) =>
        User.create({ name: `Nueva ${i}`, email: `nueva${i}@example.com`, password_hash: 'x' }),
      ),
    );
    let n = 0;
    const time = await median(() => {
      const k = n;
      n += 1;
      return request(app)
        .post('/api/reservations')
        .set('Cookie', sessionCookieFor(fresh[k]))
        .send({
          book_id: String(books[9_000 + k]._id),
          store_id: String(stores[(9_000 + k) % STORES]._id),
        });
    });
    console.info(`[rendimiento] crear reserva: ${time.toFixed(1)} ms`);
    expect(time).toBeLessThan(LIMIT_MS);
  });

  it('GET /api/reservations/mine, GET /api/reservations y GET /api/auditLogs', async () => {
    const userCookie = sessionCookieFor(users[17]);
    const mine = await median(() =>
      request(app).get('/api/reservations/mine').set('Cookie', userCookie),
    );
    const all = await median(() =>
      request(app).get('/api/reservations').set('Cookie', adminCookie),
    );
    const audit = await median(() => request(app).get('/api/auditLogs').set('Cookie', adminCookie));
    console.info(
      `[rendimiento] mis reservas: ${mine.toFixed(1)} ms; reservas (admin): ${all.toFixed(1)} ms; ` +
        `auditoría: ${audit.toFixed(1)} ms`,
    );
    expect(mine).toBeLessThan(LIMIT_MS);
    expect(all).toBeLessThan(LIMIT_MS);
    expect(audit).toBeLessThan(LIMIT_MS);
  });

  it('borrar un libro con 50 reservas activas (solo se mide)', async () => {
    const book = books[5_555];
    const store = stores[0];
    const now = Date.now();
    await Reservation.collection.insertMany(
      users.slice(100, 150).map((user) => ({
        _id: oid(),
        user_id: user._id,
        book_id: book._id,
        store_id: store._id,
        book_title: book.title,
        store_name: store.name,
        store_address: store.address,
        price_cents: 19_900,
        status: 'pending',
        is_active: true,
        expires_at: new Date(now + 86_400_000),
        ready_at: null,
        cancel_reason: null,
        created_at: new Date(now),
        updated_at: new Date(now),
      })),
    );
    const start = performance.now();
    const res = await request(app).delete(`/api/books/${book._id}`).set('Cookie', adminCookie);
    const elapsed = performance.now() - start;
    expect(res.status).toBe(204);
    expect(await Reservation.countDocuments({ book_id: book._id, is_active: true })).toBe(0);
    // Operación de administración poco frecuente: si pasa de 200 ms se anota en plan.md
    // (Complexity Tracking) en lugar de fallar.
    console.info(`[rendimiento] borrar libro con 50 reservas activas: ${elapsed.toFixed(1)} ms`);
  });
});
