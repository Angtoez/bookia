// Mi cuenta (feature 002): ver los datos y cambiar el nombre (US1). Los bloques de contraseña
// (US2) y exportación (US4) se añaden en sus historias.
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { User } from '../../src/models/User.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import { createUser, sessionCookieFor } from '../helpers/factories.js';

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
