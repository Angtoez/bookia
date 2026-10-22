import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';

const app = createApp();
const valid = { name: 'Ana Pérez', email: 'ana@example.com', password: 'lectora2024' };
const register = (body) => request(app).post('/api/auth/register').send(body);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('registro', () => {
  it('crea un usuario con rol user, abre sesión y guarda la contraseña con bcrypt', async () => {
    const res = await register(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Ana Pérez',
      email: 'ana@example.com',
      role: 'user',
    });
    expect(res.headers['set-cookie'][0]).toMatch(/^bookia_session=/);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', res.headers['set-cookie'][0].split(';')[0]);
    expect(me.body.id).toBe(res.body.id);

    const stored = await User.findById(res.body.id).select('+password_hash').lean();
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/);
    expect(Number(stored.password_hash.split('$')[2])).toBeGreaterThanOrEqual(10);
  });

  it('rechaza un correo ya registrado aunque cambien las mayúsculas', async () => {
    await register(valid);
    const res = await register({ ...valid, email: '  ANA@Example.com ' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it.each(['abcdefgh', '1234567', '12345678'])(
    'rechaza la contraseña %s por la política',
    async (password) => {
      const res = await register({ ...valid, password });
      expect(res.status).toBe(400);
      expect(res.body.error.details).toContainEqual({
        field: 'password',
        message: 'La contraseña debe tener al menos 8 caracteres, con letras y números',
      });
    },
  );

  it('ignora el campo role del cuerpo', async () => {
    const res = await register({ ...valid, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('user');
    expect((await User.findById(res.body.id)).role).toBe('user');
  });

  it('exige nombre y correo válidos', async () => {
    const res = await register({ name: '   ', email: 'no-es-correo', password: valid.password });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(['name', 'email']);
  });
});
