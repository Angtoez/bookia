// Mi cuenta (feature 002): ver los datos y cambiar el nombre (US1). Los bloques de contraseña
// (US2) y exportación (US4) se añaden en sus historias.
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { Favorite } from '../../src/models/Favorite.js';
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

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const patch = (cookie, body) => request(app).patch('/api/account').set('Cookie', cookie).send(body);

describe('perfil', () => {
  it('GET /account devuelve los datos de la cuenta sin campos internos', async () => {
    const user = await createUser({ name: 'Ana López' });
    const res = await request(app).get('/api/account').set('Cookie', sessionCookieFor(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: String(user._id),
      name: 'Ana López',
      email: user.email,
      role: 'user',
      created_at: user.created_at.toISOString(),
    });
  });

  it('sin sesión responde 401', async () => {
    const res = await request(app).get('/api/account');
    expect(res.status).toBe(401);
  });

  it('cambia el nombre recortado y lo audita como cambio de la propia cuenta', async () => {
    const user = await createUser({ name: 'Ana' });
    const res = await patch(sessionCookieFor(user), { name: '  Ana María  ' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ana María');
    expect((await User.findById(user._id)).name).toBe('Ana María');

    const logs = await AuditLog.find({ entity_id: user._id }).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: user._id,
      action: 'update',
      entity_type: 'user',
      entity_label: 'Ana María',
      before: { name: 'Ana' },
      after: { name: 'Ana María' },
    });
  });

  it('el mismo nombre responde 200 sin crear auditoría', async () => {
    const user = await createUser({ name: 'Ana' });
    const res = await patch(sessionCookieFor(user), { name: ' Ana ' });
    expect(res.status).toBe(200);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('rechaza un nombre vacío o demasiado largo', async () => {
    const user = await createUser({ name: 'Ana' });
    const cookie = sessionCookieFor(user);
    for (const name of ['   ', 'x'.repeat(101)]) {
      const res = await patch(cookie, { name });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].field).toBe('name');
    }
    expect((await User.findById(user._id)).name).toBe('Ana');
  });

  it('rechaza campos extra y no permite cambiarse el rol', async () => {
    const user = await createUser();
    const res = await patch(sessionCookieFor(user), { name: 'Otra', role: 'admin' });
    expect(res.status).toBe(400);
    expect((await User.findById(user._id)).role).toBe('user');
  });
});

describe('contraseña', () => {
  const change = (cookie, body) =>
    request(app).post('/api/account/password').set('Cookie', cookie).send(body);
  const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });

  it('cambia la contraseña, mantiene esta sesión e invalida las demás', async () => {
    const user = await createUser();
    const thisSession = sessionCookieFor(user);
    const otherSession = sessionCookieFor(user);
    const res = await change(thisSession, {
      current_password: 'secreto123',
      new_password: 'nueva-clave9',
    });
    expect(res.status).toBe(204);
    const renewed = res.headers['set-cookie'][0].split(';')[0];

    expect((await request(app).get('/api/account').set('Cookie', renewed)).status).toBe(200);
    expect((await request(app).get('/api/account').set('Cookie', otherSession)).status).toBe(401);
    expect((await login(user.email, 'secreto123')).status).toBe(401);
    expect((await login(user.email, 'nueva-clave9')).status).toBe(200);
  });

  it('audita el cambio sin la contraseña ni su hash', async () => {
    const user = await createUser();
    await change(sessionCookieFor(user), {
      current_password: 'secreto123',
      new_password: 'nueva-clave9',
    });
    const logs = await AuditLog.find({ entity_id: user._id }).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: user._id,
      action: 'update',
      entity_type: 'user',
      before: null,
      after: { password: 'changed' },
    });
    const { password_hash: hash } = await User.findById(user._id).select('+password_hash').lean();
    expect(JSON.stringify(logs)).not.toContain(hash);
    expect(JSON.stringify(logs)).not.toContain('nueva-clave9');
  });

  it('con la contraseña actual errónea responde WRONG_PASSWORD sin tocar el bloqueo', async () => {
    const user = await createUser();
    const res = await change(sessionCookieFor(user), {
      current_password: 'otra-clave1',
      new_password: 'nueva-clave9',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_PASSWORD');
    expect(res.body.error.details[0].field).toBe('current_password');
    const fresh = await User.findById(user._id);
    expect(fresh.failed_login_count).toBe(0);
    expect(fresh.session_version).toBe(0);
    expect((await login(user.email, 'secreto123')).status).toBe(200);
  });

  it('la nueva contraseña cumple la política y es distinta de la actual', async () => {
    const user = await createUser();
    const cookie = sessionCookieFor(user);
    const weak = await change(cookie, {
      current_password: 'secreto123',
      new_password: 'sinnumeros',
    });
    expect(weak.status).toBe(400);
    expect(weak.body.error.details[0]).toEqual({
      field: 'new_password',
      message: 'La contraseña debe tener al menos 8 caracteres, con letras y números',
    });

    const same = await change(cookie, {
      current_password: 'secreto123',
      new_password: 'secreto123',
    });
    expect(same.status).toBe(400);
    expect(same.body.error.code).toBe('VALIDATION_ERROR');
    expect(same.body.error.details[0]).toEqual({
      field: 'new_password',
      message: 'La nueva contraseña debe ser distinta de la actual',
    });
    expect(await AuditLog.countDocuments()).toBe(0);
  });
});

describe('exportación', () => {
  const exportAs = (cookie) => request(app).get('/api/account/export').set('Cookie', cookie);

  it('descarga la cuenta, sus reservas y sus favoritos, sin datos de seguridad ni de otros', async () => {
    const store = await createStore({ name: 'Librería Centro' });
    const books = [await createBook({ title: 'Primero' }), await createBook({ title: 'Segundo' })];
    for (const book of books) {
      await createStoreBook({ book_id: book._id, store_id: store._id, stock: 2 });
    }
    const user = await createUser({ name: 'Ana Export' });
    const other = await createUser();
    const cookie = sessionCookieFor(user);
    for (const book of books) {
      const res = await request(app)
        .post('/api/reservations')
        .set('Cookie', cookie)
        .send({ book_id: String(book._id), store_id: String(store._id) });
      expect(res.status).toBe(201);
    }
    await request(app)
      .post('/api/reservations')
      .set('Cookie', sessionCookieFor(other))
      .send({ book_id: String(books[0]._id), store_id: String(store._id) });
    await Favorite.create({ user_id: user._id, book_id: books[1]._id });
    await Favorite.create({ user_id: other._id, book_id: books[0]._id });

    const res = await exportAs(cookie);
    expect(res.status).toBe(200);
    const today = new Date().toISOString().slice(0, 10);
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="bookia-mis-datos-${today}.json"`,
    );
    expect(res.body.exported_at).toBeTruthy();
    expect(res.body.account).toEqual({
      name: 'Ana Export',
      email: user.email,
      role: 'user',
      created_at: user.created_at.toISOString(),
    });
    expect(res.body.reservations.map((r) => r.book_title)).toEqual(['Segundo', 'Primero']);
    expect(res.body.reservations[0]).toMatchObject({
      book_isbn: books[1].isbn,
      store_name: 'Librería Centro',
      status: 'pending',
      cancel_reason: null,
    });
    expect(res.body.favorites).toEqual([
      expect.objectContaining({ title: 'Segundo', author: books[1].author, isbn: books[1].isbn }),
    ]);
    expect(res.body.favorites[0].added_at).toBeTruthy();

    const text = JSON.stringify(res.body);
    for (const field of [
      'password_hash',
      'failed_login_count',
      'locked_until',
      'session_version',
      '_id',
      '"id"',
    ]) {
      expect(text).not.toContain(field);
    }
    expect(text).not.toContain(other.email);
  });

  it('una cuenta sin reservas ni favoritos recibe listas vacías', async () => {
    const user = await createUser();
    const res = await exportAs(sessionCookieFor(user));
    expect(res.body).toMatchObject({ reservations: [], favorites: [] });
  });
});
