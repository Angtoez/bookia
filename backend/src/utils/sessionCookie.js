// Cookie de sesión con JWT (research R3): httpOnly, secure y sameSite strict.
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const SESSION_COOKIE = 'bookia_session';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const cookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };

export function setSessionCookie(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, ENV.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE_MS });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Devuelve el id de usuario del token, o null si no es válido o ha caducado. */
export function readSessionUserId(token) {
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
