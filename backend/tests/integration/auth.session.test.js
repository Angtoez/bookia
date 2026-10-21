import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import { createGenre, createUser, loginAs } from '../helpers/factories.js';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('sesión', () => {
  it('pone una cookie httpOnly, secure y sameSite strict sin exponer el hash', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email.toUpperCase(), password: 'secreto123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: 'user',
    });
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^bookia_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);
  });

  it('responde igual a una contraseña errónea y a un correo inexistente', async () => {
    const user = await createUser();
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'otra-clave1' });
    const missing = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@example.com', password: 'otra-clave1' });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body).toEqual(missing.body);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('valida el cuerpo del login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no-es-correo' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(['email', 'password']);
  });

  it('GET /me exige sesión y logout borra la cookie', async () => {
    const user = await createUser();
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const cookie = await loginAs(app, user);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body).not.toHaveProperty('password_hash');
    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    expect(out.headers['set-cookie'][0]).toMatch(/bookia_session=;/);
  });

  it('una cuenta desactivada pierde el acceso en la siguiente petición', async () => {
    const user = await createUser();
    const cookie = await loginAs(app, user);
    await User.updateOne({ _id: user._id }, { status: 'disabled' });
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rechaza un token manipulado', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'bookia_session=abc.def.ghi');
    expect(res.status).toBe(401);
  });
});

describe('configuración pública', () => {
  it('GET /config y GET /genres', async () => {
    await createGenre({ name: 'Poesía', slug: 'poesia' });
    await createGenre({ name: 'Novela', slug: 'novela' });
    const config = await request(app).get('/api/config');
    expect(config.body.currency).toBe('MXN');
    const genres = await request(app).get('/api/genres');
    expect(genres.body.map((g) => g.slug)).toEqual(['novela', 'poesia']);
    expect(Object.keys(genres.body[0]).sort()).toEqual(['id', 'name', 'slug']);
  });

  it('una ruta inexistente responde 404 con el formato de error', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
