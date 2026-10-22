import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import { DEFAULT_PASSWORD, createUser } from '../helpers/factories.js';

// Una app por prueba: el límite por IP (20 peticiones) es de cada instancia.
let app;
const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });

async function failTimes(email, times) {
  for (let i = 0; i < times; i += 1) await login(email, 'incorrecta1');
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  app = createApp();
});

describe('bloqueo por intentos fallidos', () => {
  it('cuenta los fallos y bloquea la cuenta 15 minutos al 5.º', async () => {
    const user = await createUser();
    await failTimes(user.email, 4);
    expect((await User.findById(user._id)).failed_login_count).toBe(4);
    await failTimes(user.email, 1);
    const locked = await User.findById(user._id);
    expect(locked.failed_login_count).toBe(0);
    const minutes = (locked.locked_until.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);
  });

  it('con la cuenta bloqueada, la contraseña correcta recibe el mismo 401', async () => {
    const user = await createUser();
    await failTimes(user.email, 5);
    const wrong = await login(user.email, 'incorrecta1');
    const right = await login(user.email, DEFAULT_PASSWORD);
    expect(right.status).toBe(401);
    expect(right.body).toEqual(wrong.body);
    expect(right.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(right.headers['set-cookie']).toBeUndefined();
  });

  it('al vencer el bloqueo se puede entrar y el contador vuelve a 0', async () => {
    const user = await createUser();
    await failTimes(user.email, 5);
    await User.updateOne({ _id: user._id }, { locked_until: new Date(Date.now() - 1000) });
    await failTimes(user.email, 2);
    const res = await login(user.email, DEFAULT_PASSWORD);
    expect(res.status).toBe(200);
    const after = await User.findById(user._id);
    expect(after.failed_login_count).toBe(0);
    expect(after.locked_until).toBeNull();
  });

  it('un correo inexistente responde igual que una cuenta bloqueada', async () => {
    const user = await createUser();
    await failTimes(user.email, 5);
    const locked = await login(user.email, DEFAULT_PASSWORD);
    const missing = await login('nadie@example.com', DEFAULT_PASSWORD);
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual(locked.body);
  });

  it('una cuenta desactivada recibe el 401 genérico aunque acierte', async () => {
    const user = await createUser({ status: 'disabled' });
    const res = await login(user.email, DEFAULT_PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
