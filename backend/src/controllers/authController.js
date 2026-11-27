// Registro, inicio y cierre de sesión, con bloqueo tras intentos fallidos (US4, research R4).
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { toUserMe } from '../utils/presenters.js';
import { clearSessionCookie, setSessionCookie } from '../utils/sessionCookie.js';

export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

// Hash ficticio con el mismo coste que los reales: se compara contra él cuando el correo no
// existe o la cuenta está bloqueada, para que el tiempo de respuesta no lo delate (FR-003).
const DUMMY_HASH = bcrypt.hashSync('bookia-dummy-password-0', ENV.BCRYPT_ROUNDS);

const invalidCredentials = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');

export async function register(req, res) {
  const { name, email, password } = req.validated.body;
  const passwordHash = await bcrypt.hash(password, ENV.BCRYPT_ROUNDS);
  // Un correo repetido viola el índice único y el errorHandler responde 409 EMAIL_TAKEN.
  const user = await User.create({ name, email, password_hash: passwordHash, role: 'user' });
  setSessionCookie(res, user);
  res.status(201).json(toUserMe(user));
}

/** Suma un fallo con $inc y, al llegar al máximo, bloquea la cuenta y reinicia el contador (FR-004). */
async function registerFailedLogin(userId, now) {
  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { failed_login_count: 1 } },
    { new: true },
  );
  if (updated && updated.failed_login_count >= MAX_FAILED_LOGINS) {
    await User.updateOne(
      // sanitizeFilter está activo: el operador se marca como de confianza.
      { _id: userId, failed_login_count: mongoose.trusted({ $gte: MAX_FAILED_LOGINS }) },
      {
        $set: { failed_login_count: 0, locked_until: new Date(now.getTime() + LOCK_DURATION_MS) },
      },
    );
  }
}

export async function login(req, res) {
  const { email, password } = req.validated.body;
  const now = new Date();
  const user = await User.findOne({ email }).select('+password_hash');
  const isLocked = Boolean(user?.locked_until && user.locked_until > now);
  // Una cuenta bloqueada no compara la contraseña real, pero sí la ficticia.
  const hash = user && !isLocked ? user.password_hash : DUMMY_HASH;
  const matches = await bcrypt.compare(password, hash);
  if (!user || isLocked) throw invalidCredentials();
  if (!matches) {
    await registerFailedLogin(user._id, now);
    throw invalidCredentials();
  }
  // Una cuenta desactivada recibe el mismo mensaje genérico (FR-003, FR-025).
  if (user.status !== 'active') throw invalidCredentials();
  if (user.failed_login_count > 0 || user.locked_until) {
    await User.updateOne(
      { _id: user._id },
      { $set: { failed_login_count: 0, locked_until: null } },
    );
  }
  setSessionCookie(res, user);
  res.json(toUserMe(user));
}

export function logout(_req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json(toUserMe(req.user));
}
