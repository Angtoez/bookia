import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { AuditLog } from '../../src/models/AuditLog.js';
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
const DAY_MS = 24 * 60 * 60 * 1000;
let admin;
let adminCookie;
let user;
let userCookie;

const post = (path, cookie) => request(app).post(`/api/reservations${path}`).set('Cookie', cookie);

async function reservation({ stock = 2, store } = {}) {
  const book = await createBook();
  const s = store ?? (await createStore());
  await createStoreBook({ book_id: book._id, store_id: s._id, stock });
  const res = await request(app)
    .post('/api/reservations')
    .set('Cookie', userCookie)
    .send({ book_id: String(book._id), store_id: String(s._id) });
  return { ...res.body, book, store: s };
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  admin = await createAdmin();
  adminCookie = sessionCookieFor(admin);
  user = await createUser();
  userCookie = sessionCookieFor(user);
});

describe('gestión de reservas', () => {
  it('ready fija ready_at y expires_at a 3 días', async () => {
    const r = await reservation();
    const res = await post(`/${r.id}/ready`, adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    const days = (new Date(res.body.expires_at) - new Date(res.body.ready_at)) / DAY_MS;
    expect(days).toBeCloseTo(3, 3);
  });

  it('pickup descuenta el stock y libera los contadores', async () => {
    const r = await reservation({ stock: 2 });
    await post(`/${r.id}/ready`, adminCookie);
    const res = await post(`/${r.id}/pickup`, adminCookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'picked_up', expires_at: null });
    expect(res.body.closed_at).not.toBeNull();
    const sb = await StoreBook.findOne({ book_id: r.book._id });
    expect(sb).toMatchObject({ stock: 1, reserved_count: 0 });
    expect((await User.findById(user._id)).active_reservations).toBe(0);
  });

  it('pickup sobre una reserva pending es INVALID_TRANSITION', async () => {
    const r = await reservation();
    const res = await post(`/${r.id}/pickup`, adminCookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('una reserva inexistente responde 404', async () => {
    const res = await post('/0123456789abcdef01234567/ready', adminCookie);
    expect(res.status).toBe(404);
  });

  it('filtra por estado y tienda e incluye los datos del usuario', async () => {
    const store = await createStore();
    const a = await reservation({ store });
    const b = await reservation({ store });
    await reservation();
    await post(`/${b.id}/ready`, adminCookie);
    const res = await request(app)
      .get(`/api/reservations?status=pending&store_id=${store._id}`)
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      id: a.id,
      user: { id: String(user._id), name: user.name, email: user.email },
    });
    const all = await request(app).get('/api/reservations').set('Cookie', adminCookie);
    expect(all.body.total).toBe(3);
  });

  it('la cancelación del administrador lleva cancel_reason admin', async () => {
    const r = await reservation();
    const res = await post(`/${r.id}/cancel`, adminCookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'cancelled', cancel_reason: 'admin' });
  });

  it('audita las transiciones del administrador y no la cancelación del titular', async () => {
    const r1 = await reservation();
    await post(`/${r1.id}/ready`, adminCookie);
    await post(`/${r1.id}/pickup`, adminCookie);
    const r2 = await reservation();
    await post(`/${r2.id}/cancel`, userCookie);
    const logs = await AuditLog.find({ entity_type: 'reservation' }).sort({ created_at: 1 });
    expect(logs).toHaveLength(2);
    for (const log of logs) {
      expect(log.action).toBe('status_change');
      expect(String(log.user_id)).toBe(String(admin._id));
      expect(String(log.entity_id)).toBe(r1.id);
    }
    expect(logs.map((l) => l.after.status)).toEqual(['ready', 'picked_up']);
  });

  it('un usuario no puede usar las rutas de administración', async () => {
    const r = await reservation();
    expect((await request(app).get('/api/reservations').set('Cookie', userCookie)).status).toBe(
      403,
    );
    expect((await post(`/${r.id}/ready`, userCookie)).status).toBe(403);
    expect((await post(`/${r.id}/pickup`, userCookie)).status).toBe(403);
  });
});
