// Cookie de sesión con JWT (research R3): httpOnly, secure y sameSite strict. El token lleva la
// versión de sesión del usuario (`ver`), que invalida los anteriores al cambiar la contraseña
// (feature 002, research R2).
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const SESSION_COOKIE = 'bookia_session';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const cookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };

/** @param {{_id: any, session_version?: number}} user */
export function setSessionCookie(res, user) {
  const payload = { sub: String(user._id), ver: user.session_version ?? 0 };
  const token = jwt.sign(payload, ENV.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE_MS });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/**
 * Devuelve el id de usuario y la versión de sesión del token, o null si no es válido o ha
 * caducado. Un token emitido antes de la feature 002 no lleva `ver` y cuenta como versión 0.
 * @returns {{userId: string, version: number} | null}
 */
export function readSession(token) {
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') return null;
    return { userId: payload.sub, version: Number.isInteger(payload.ver) ? payload.ver : 0 };
  } catch {
    return null;
  }
}
