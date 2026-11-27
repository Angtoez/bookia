// Borrado de la propia cuenta (feature 002, US3): cascada, anonimización, último administrador y
// concurrencia (FR-012 a FR-020, SC-003 a SC-005).
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { Favorite } from '../../src/models/Favorite.js';
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
let admin;
let adminCookie;

const remove = (cookie, password = 'secreto123') =>
  request(app).delete('/api/account').set('Cookie', cookie).send({ password });

async function reserve(user, book, store) {
  const res = await request(app)
    .post('/api/reservations')
    .set('Cookie', sessionCookieFor(user))
    .send({ book_id: String(book._id), store_id: String(store._id) });
  expect(res.status).toBe(201);
  return res.body;
}

const adminAction = (id, action) =>
  request(app).post(`/api/reservations/${id}/${action}`).set('Cookie', adminCookie);

/** Usuario con una reserva pendiente, una lista, una recogida y un favorito. */
async function scenario() {
  const store = await createStore();
  const books = [await createBook(), await createBook(), await createBook()];
  for (const book of books) {
    await createStoreBook({ book_id: book._id, store_id: store._id, stock: 3 });
  }
  const user = await createUser({ name: 'Ana Borrable' });
  const reservations = [];
  for (const book of books) reservations.push(await reserve(user, book, store));
  await adminAction(reservations[1].id, 'ready');
  await adminAction(reservations[2].id, 'ready');
  await adminAction(reservations[2].id, 'pickup');
  await Favorite.create({ user_id: user._id, book_id: books[0]._id });
  return { store, books, user, reservations };
}

/** Todos los documentos de las colecciones con datos de personas, como texto. */
async function everything() {
  const collections = ['users', 'reservations', 'favorites', 'audit_logs'];
  const docs = [];
  for (const name of collections) {
    docs.push(...(await mongoose.connection.collection(name).find().toArray()));
  }
  return JSON.stringify(docs);
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  admin = await createAdmin({ name: 'Admin Principal' });
  adminCookie = sessionCookieFor(admin);
});

describe('borrar la cuenta', () => {
  it('cancela las reservas activas, borra los favoritos y la cuenta, y libera el correo', async () => {
    const { store, books, user, reservations } = await scenario();
    const res = await remove(sessionCookieFor(user));
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie'][0]).toMatch(/bookia_session=;/);

    const byId = async (r) => Reservation.findById(r.id);
    for (const r of reservations.slice(0, 2)) {
      expect(await byId(r)).toMatchObject({
        status: 'cancelled',
        cancel_reason: 'account_deleted',
      });
    }
    expect((await byId(reservations[2])).status).toBe('picked_up');
    for (const book of books.slice(0, 2)) {
      const sb = await StoreBook.findOne({ book_id: book._id, store_id: store._id });
      expect(sb.reserved_count).toBe(0);
    }
    expect(await Favorite.countDocuments({ user_id: user._id })).toBe(0);
    expect(await User.findById(user._id)).toBeNull();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'secreto123' });
    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe('INVALID_CREDENTIALS');
    const again = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Nueva', email: user.email, password: 'secreto123' });
    expect(again.status).toBe(201);
  });

  it('no deja rastro del nombre ni del correo en ninguna colección (SC-003)', async () => {
    const { user } = await scenario();
    const cookie = sessionCookieFor(user);
    await request(app).patch('/api/account').set('Cookie', cookie).send({ name: 'Ana Renombrada' });
    await request(app)
      .patch(`/api/users/${user._id}`)
      .set('Cookie', adminCookie)
      .send({ role: 'admin' });
    await request(app)
      .patch(`/api/users/${user._id}`)
      .set('Cookie', adminCookie)
      .send({ role: 'user' });
    expect(await everything()).toContain('Ana Renombrada');

    expect((await remove(cookie)).status).toBe(204);
    const all = await everything();
    for (const value of ['Ana Borrable', 'Ana Renombrada', user.email]) {
      expect(all).not.toContain(value);
    }
  });

  it('la auditoría y las reservas muestran «Cuenta eliminada» y no lo confunden con el sistema', async () => {
    const { user } = await scenario();
    await AuditLog.create({
      user_id: null,
      action: 'status_change',
      entity_type: 'reservation',
      entity_id: new mongoose.Types.ObjectId(),
      entity_label: 'Job',
    });
    expect((await remove(sessionCookieFor(user))).status).toBe(204);

    const logs = (await request(app).get('/api/auditLogs?limit=50').set('Cookie', adminCookie)).body
      .items;
    const aboutUser = logs.filter(
      (l) => l.entity_type === 'user' && l.entity_id === String(user._id),
    );
    expect(aboutUser.length).toBeGreaterThan(0);
    for (const log of aboutUser) expect(log.entity_label).toBe('Cuenta eliminada');
    const byUser = logs.filter((l) => l.user_deleted);
    expect(byUser.length).toBeGreaterThan(0);
    for (const log of byUser) expect(log.user).toBeNull();
    const system = logs.find((l) => l.entity_label === 'Job');
    expect(system).toMatchObject({ user: null, user_deleted: false });
    const byAdmin = logs.find((l) => l.user?.name === 'Admin Principal');
    expect(byAdmin.user_deleted).toBe(false);

    const list = await request(app).get('/api/reservations').set('Cookie', adminCookie);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(3);
    for (const r of list.body.items) expect(r.user).toBeNull();
  });

  it('con la contraseña errónea no borra nada', async () => {
    const { user } = await scenario();
    const res = await remove(sessionCookieFor(user), 'otra-clave1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_PASSWORD');
    expect(res.body.error.details[0].field).toBe('password');
    expect(await User.findById(user._id)).not.toBeNull();
    expect(await Reservation.countDocuments({ user_id: user._id, is_active: true })).toBe(2);
    expect(await Favorite.countDocuments({ user_id: user._id })).toBe(1);
  });

  it('el último administrador activo no puede borrar su cuenta', async () => {
    const res = await remove(adminCookie);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'LAST_ADMIN',
      message: 'No puedes borrar tu cuenta: eres el último administrador activo',
    });
    expect(await User.findById(admin._id)).not.toBeNull();
  });

  it('un administrador que no es el último sí puede borrar su cuenta', async () => {
    const other = await createAdmin();
    expect((await remove(sessionCookieFor(other))).status).toBe(204);
    expect(await User.countDocuments({ role: 'admin', status: 'active' })).toBe(1);
  });

  it('dos administradores que se borran a la vez dejan uno activo (SC-005)', async () => {
    const other = await createAdmin();
    const results = await Promise.all([remove(adminCookie), remove(sessionCookieFor(other))]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    expect(await User.countDocuments({ role: 'admin', status: 'active' })).toBe(1);
  });
});
