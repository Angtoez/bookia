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
let admin;
let adminCookie;

const patch = (user, body, as = adminCookie) =>
  request(app).patch(`/api/users/${user._id}`).set('Cookie', as).send(body);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  admin = await createAdmin({ name: 'Ana Admin' });
  adminCookie = sessionCookieFor(admin);
});

describe('GET /api/users', () => {
  it('busca por nombre o correo sin distinguir mayúsculas y nunca devuelve password_hash', async () => {
    await createUser({ name: 'Luis Pérez', email: 'luis@example.com' });
    await createUser({ name: 'Marta', email: 'marta.perez@example.com' });
    await createUser({ name: 'Otro', email: 'otro@example.com' });

    const res = await request(app).get('/api/users?q=PEREZ').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toEqual({
      id: expect.any(String),
      name: 'Marta',
      email: 'marta.perez@example.com',
      role: 'user',
      status: 'active',
      created_at: expect.any(String),
    });

    const all = await request(app).get('/api/users').set('Cookie', adminCookie);
    expect(all.body.total).toBe(4);
    expect(JSON.stringify(all.body)).not.toContain('password_hash');
  });

  it('trata q como texto literal', async () => {
    await createUser({ name: 'a.b' });
    await createUser({ name: 'axb' });
    const res = await request(app).get('/api/users?q=a.b').set('Cookie', adminCookie);
    expect(res.body.items.map((u) => u.name)).toEqual(['a.b']);
  });

  it('un usuario sin rol admin recibe 403 y sin sesión 401', async () => {
    const user = await createUser();
    const asUser = await request(app).get('/api/users').set('Cookie', sessionCookieFor(user));
    expect(asUser.status).toBe(403);
    expect((await patch(admin, { role: 'user' }, sessionCookieFor(user))).status).toBe(403);
    expect((await request(app).get('/api/users')).status).toBe(401);
  });
});

describe('PATCH /api/users/:id', () => {
  it('el usuario promovido pasa requireRole en su siguiente petición', async () => {
    const user = await createUser();
    const cookie = sessionCookieFor(user);
    expect((await request(app).get('/api/users').set('Cookie', cookie)).status).toBe(403);

    const res = await patch(user, { role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: String(user._id), role: 'admin', status: 'active' });
    expect((await request(app).get('/api/users').set('Cookie', cookie)).status).toBe(200);

    const log = await AuditLog.findOne({ action: 'role_change' }).lean();
    expect(log).toMatchObject({
      user_id: admin._id,
      entity_type: 'user',
      entity_label: user.name,
      before: { role: 'user', status: 'active' },
      after: { role: 'admin', status: 'active' },
    });
  });

  it('desactivar corta la sesión y cancela sus reservas activas', async () => {
    const user = await createUser();
    const cookie = sessionCookieFor(user);
    const book = await createBook();
    const store = await createStore();
    await createStoreBook({ book_id: book._id, store_id: store._id, stock: 2 });
    const reserve = await request(app)
      .post('/api/reservations')
      .set('Cookie', cookie)
      .send({ book_id: String(book._id), store_id: String(store._id) });
    expect(reserve.status).toBe(201);

    const res = await patch(user, { status: 'disabled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('disabled');

    expect((await request(app).get('/api/reservations/mine').set('Cookie', cookie)).status).toBe(
      401,
    );
    const reservation = await Reservation.findById(reserve.body.id).lean();
    expect(reservation).toMatchObject({
      status: 'cancelled',
      cancel_reason: 'account_deactivated',
    });
    const sb = await StoreBook.findOne({ store_id: store._id }).lean();
    expect(sb.reserved_count).toBe(0);
    expect((await User.findById(user._id).lean()).active_reservations).toBe(0);

    const logs = await AuditLog.find({ action: 'status_change' }).lean();
    expect(logs.map((l) => l.entity_type).sort()).toEqual(['reservation', 'user']);
    const userLog = logs.find((l) => l.entity_type === 'user');
    expect(userLog.before).toEqual({ role: 'user', status: 'active' });
    expect(userLog.after).toEqual({ role: 'user', status: 'disabled' });
  });

  it('reactivar una cuenta le devuelve el acceso', async () => {
    const user = await createUser({ status: 'disabled' });
    expect((await patch(user, { status: 'active' })).status).toBe(200);
    const me = await request(app)
      .get('/api/reservations/mine')
      .set('Cookie', sessionCookieFor(user));
    expect(me.status).toBe(200);
  });

  it('impide degradar o desactivar al único administrador activo', async () => {
    // Un administrador desactivado no cuenta.
    await createAdmin({ status: 'disabled' });
    for (const body of [{ role: 'user' }, { status: 'disabled' }]) {
      const res = await patch(admin, body);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'LAST_ADMIN',
        message: 'Debe quedar al menos un administrador activo',
      });
    }
    expect(await User.findById(admin._id).lean()).toMatchObject({
      role: 'admin',
      status: 'active',
    });
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('con otro administrador activo sí se puede degradar', async () => {
    await createAdmin();
    expect((await patch(admin, { role: 'user' })).status).toBe(200);
    // Ya no es admin: su siguiente petición de gestión da 403.
    expect((await request(app).get('/api/users').set('Cookie', adminCookie)).status).toBe(403);
  });

  it('dos degradaciones simultáneas no dejan el sistema sin administradores', async () => {
    const other = await createAdmin();
    const results = await Promise.all([
      patch(admin, { role: 'user' }),
      patch(other, { role: 'user' }, sessionCookieFor(other)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await User.countDocuments({ role: 'admin', status: 'active' })).toBe(1);
  });

  it('cambiar rol y estado a la vez genera una entrada de cada tipo', async () => {
    const user = await createUser();
    expect((await patch(user, { role: 'admin', status: 'disabled' })).status).toBe(200);
    const logs = await AuditLog.find({ entity_id: user._id }).sort({ action: 1 }).lean();
    expect(logs.map((l) => [l.action, l.before, l.after])).toEqual([
      ['role_change', { role: 'user', status: 'active' }, { role: 'admin', status: 'active' }],
      ['status_change', { role: 'admin', status: 'active' }, { role: 'admin', status: 'disabled' }],
    ]);
  });

  it('un cambio que no cambia nada no se audita', async () => {
    const user = await createUser();
    expect((await patch(user, { role: 'user' })).status).toBe(200);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('valida el cuerpo y el id', async () => {
    const user = await createUser();
    expect((await patch(user, {})).status).toBe(400);
    expect((await patch(user, { role: 'root' })).status).toBe(400);
    expect((await patch(user, { name: 'x' })).status).toBe(400);
    const missing = await request(app)
      .patch('/api/users/0123456789abcdef01234567')
      .set('Cookie', adminCookie)
      .send({ role: 'admin' });
    expect(missing.status).toBe(404);
  });
});
