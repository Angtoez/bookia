// Carga el usuario de la sesión en cada petición, así que los cambios de rol o estado
// se aplican en la siguiente acción (FR-025).
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { SESSION_COOKIE, clearSessionCookie, readSessionUserId } from '../utils/sessionCookie.js';

async function loadSessionUser(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const userId = readSessionUserId(token);
  if (!userId || !mongoose.isValidObjectId(userId)) return null;
  const user = await User.findById(userId);
  if (!user || user.status !== 'active') return null;
  return user;
}

export async function authenticate(req, res, next) {
  const user = await loadSessionUser(req);
  if (!user) {
    if (req.cookies?.[SESSION_COOKIE]) clearSessionCookie(res);
    throw new HttpError(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar');
  }
  req.user = user;
  next();
}

/** Como authenticate, pero sin fallar: sin sesión válida deja req.user = null. */
export async function optionalAuthenticate(req, res, next) {
  const user = await loadSessionUser(req);
  if (!user && req.cookies?.[SESSION_COOKIE]) clearSessionCookie(res);
  req.user = user;
  next();
}
