import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { Favorite } from '../../src/models/Favorite.js';
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
let user;
let cookie;

const put = (bookId, as = cookie) => request(app).put(`/api/favorites/${bookId}`).set('Cookie', as);
const list = (as = cookie) => request(app).get('/api/favorites').set('Cookie', as);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  user = await createUser();
  cookie = sessionCookieFor(user);
});

describe('favoritos', () => {
  it('PUT es idempotente y deja un solo documento', async () => {
    const book = await createBook();
    expect((await put(book._id)).status).toBe(204);
    expect((await put(book._id)).status).toBe(204);
    expect(await Favorite.countDocuments({ user_id: user._id })).toBe(1);
  });

  it('GET devuelve BookSummary con stores_available', async () => {
    const book = await createBook();
    const [a, b, c] = [await createStore(), await createStore(), await createStore()];
    await createStoreBook({ book_id: book._id, store_id: a._id, stock: 2 });
    await createStoreBook({ book_id: book._id, store_id: b._id, stock: 1, reserved_count: 1 });
    await createStoreBook({ book_id: book._id, store_id: c._id, stock: 0 });
    const sinStock = await createBook();
    await put(book._id);
    await put(sinStock._id);

    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    // Del más reciente al más antiguo.
    expect(res.body.items.map((i) => i.id)).toEqual([String(sinStock._id), String(book._id)]);
    expect(res.body.items[1]).toMatchObject({
      id: String(book._id),
      title: book.title,
      genre: { id: String(book.genre_id) },
      is_favorite: true,
      stores_available: 1,
    });
    expect(res.body.items[0].stores_available).toBe(0);
  });

  it('DELETE es idempotente', async () => {
    const book = await createBook();
    await put(book._id);
    const del = () => request(app).delete(`/api/favorites/${book._id}`).set('Cookie', cookie);
    expect((await del()).status).toBe(204);
    expect((await del()).status).toBe(204);
    expect((await list()).body.total).toBe(0);
  });

  it('un libro inexistente responde 404 y un id mal formado, 400', async () => {
    expect((await put('0123456789abcdef01234567')).status).toBe(404);
    expect((await put('no-es-un-id')).status).toBe(400);
  });

  it('cada usuario solo ve los suyos', async () => {
    const [mine, theirs] = [await createBook(), await createBook()];
    await put(mine._id);
    const other = sessionCookieFor(await createUser());
    await put(theirs._id, other);
    expect((await list()).body.items.map((i) => i.id)).toEqual([String(mine._id)]);
    expect((await list(other)).body.items.map((i) => i.id)).toEqual([String(theirs._id)]);
  });

  it('un anónimo recibe 401', async () => {
    const book = await createBook();
    expect((await request(app).get('/api/favorites')).status).toBe(401);
    expect((await request(app).put(`/api/favorites/${book._id}`)).status).toBe(401);
    expect((await request(app).delete(`/api/favorites/${book._id}`)).status).toBe(401);
  });

  it('al borrar el libro desaparece de los favoritos', async () => {
    const book = await createBook();
    await put(book._id);
    await put(book._id, sessionCookieFor(await createUser()));
    const admin = sessionCookieFor(await createAdmin());
    const impact = await request(app)
      .get(`/api/books/${book._id}/deletionImpact`)
      .set('Cookie', admin);
    expect(impact.body.favorites).toBe(2);
    await request(app).delete(`/api/books/${book._id}`).set('Cookie', admin);
    expect(await Favorite.countDocuments()).toBe(0);
    expect((await list()).body.total).toBe(0);
  });
});

describe('is_favorite en el catálogo', () => {
  it('aparece con sesión y no sin ella, en el listado y en el detalle', async () => {
    const [fav, other] = [await createBook(), await createBook()];
    await put(fav._id);

    const withSession = await request(app).get('/api/books').set('Cookie', cookie);
    const flags = Object.fromEntries(withSession.body.items.map((b) => [b.id, b.is_favorite]));
    expect(flags).toEqual({ [String(fav._id)]: true, [String(other._id)]: false });

    const anonymous = await request(app).get('/api/books');
    for (const item of anonymous.body.items) expect(item).not.toHaveProperty('is_favorite');

    const detail = await request(app).get(`/api/books/${fav._id}`).set('Cookie', cookie);
    expect(detail.body.is_favorite).toBe(true);
    const anonDetail = await request(app).get(`/api/books/${fav._id}`);
    expect(anonDetail.body).not.toHaveProperty('is_favorite');
  });

  it('una cookie no válida no impide ver el catálogo', async () => {
    await createBook();
    const res = await request(app).get('/api/books').set('Cookie', 'bookia_session=abc.def.ghi');
    expect(res.status).toBe(200);
    expect(res.body.items[0]).not.toHaveProperty('is_favorite');
  });
});
