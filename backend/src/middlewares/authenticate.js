// Carga el usuario de la sesión en cada petición, así que los cambios de rol o estado
// se aplican en la siguiente acción (FR-025). Un token de una versión de sesión anterior
// (antes de un cambio de contraseña) ya no vale (feature 002, research R2).
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { SESSION_COOKIE, clearSessionCookie, readSession } from '../utils/sessionCookie.js';

async function loadSessionUser(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const session = readSession(token);
  if (!session || !mongoose.isValidObjectId(session.userId)) return null;
  const user = await User.findById(session.userId);
  if (!user || user.status !== 'active') return null;
  if ((user.session_version ?? 0) !== session.version) return null;
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
