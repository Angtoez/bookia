// Inicio y cierre de sesión (feature 001, fase base). El registro y el bloqueo llegan con US4.
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { toUserMe } from '../utils/presenters.js';
import { clearSessionCookie, setSessionCookie } from '../utils/sessionCookie.js';

// Hash ficticio para comparar aunque el correo no exista e igualar tiempos (research R4).
const DUMMY_HASH = bcrypt.hashSync('bookia-dummy-password-0', 10);

const invalidCredentials = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');

export async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email }).select('+password_hash');
  const matches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  // Una cuenta desactivada recibe el mismo mensaje genérico (FR-003, FR-025).
  if (!user || !matches || user.status !== 'active') throw invalidCredentials();
  setSessionCookie(res, user._id);
  res.json(toUserMe(user));
}

export function logout(_req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json(toUserMe(req.user));
}
