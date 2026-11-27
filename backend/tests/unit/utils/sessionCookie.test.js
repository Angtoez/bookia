// Versión de sesión en el JWT (feature 002, research R2).
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { ENV } from '../../../src/config/env.js';
import { SESSION_COOKIE, readSession, setSessionCookie } from '../../../src/utils/sessionCookie.js';

const sign = (payload, options = {}) =>
  jwt.sign(payload, ENV.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h', ...options });

describe('sessionCookie', () => {
  it('firma el id y la versión de sesión del usuario', () => {
    const res = { cookie: vi.fn() };
    setSessionCookie(res, { _id: 'u1', session_version: 3 });
    const [name, token, options] = res.cookie.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE);
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'strict' });
    expect(jwt.verify(token, ENV.JWT_SECRET)).toMatchObject({ sub: 'u1', ver: 3 });
  });

  it('usa la versión 0 si el usuario no la tiene', () => {
    const res = { cookie: vi.fn() };
    setSessionCookie(res, { _id: 'u1' });
    expect(jwt.verify(res.cookie.mock.calls[0][1], ENV.JWT_SECRET).ver).toBe(0);
  });

  it('lee el id y la versión; un token anterior sin versión es la versión 0', () => {
    expect(readSession(sign({ sub: 'u1', ver: 2 }))).toEqual({ userId: 'u1', version: 2 });
    expect(readSession(sign({ sub: 'u1' }))).toEqual({ userId: 'u1', version: 0 });
  });

  it('devuelve null con un token manipulado, caducado o sin sub', () => {
    const token = sign({ sub: 'u1', ver: 0 });
    expect(readSession(`${token.slice(0, -2)}xx`)).toBeNull();
    expect(readSession(sign({ sub: 'u1' }, { expiresIn: -10 }))).toBeNull();
    expect(readSession(sign({ ver: 1 }))).toBeNull();
    expect(readSession(jwt.sign({ sub: 'u1' }, 'otro-secreto'))).toBeNull();
  });
});
