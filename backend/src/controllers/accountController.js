// Mi cuenta: autoservicio de la cuenta de la sesión (feature 002). Siempre actúa sobre req.user:
// ninguna operación recibe un id, así que no puede tocar otra cuenta (FR-003).
import bcrypt from 'bcrypt';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { buildAccountExport, deleteAccountCascade } from '../services/accountService.js';
import { record } from '../services/auditService.js';
import { runInTransaction } from '../services/transaction.js';
import { HttpError } from '../utils/httpError.js';
import { toAccount } from '../utils/presenters.js';
import { clearSessionCookie, setSessionCookie } from '../utils/sessionCookie.js';

const WRONG_PASSWORD_MESSAGE = 'La contraseña actual no es correcta';

/** 400 y no 401: un 401 haría creer al cliente que la sesión caducó (research R3). */
export const wrongPassword = (field) =>
  new HttpError(400, 'WRONG_PASSWORD', WRONG_PASSWORD_MESSAGE, [
    { field, message: WRONG_PASSWORD_MESSAGE },
  ]);

/**
 * Comprueba la contraseña de la cuenta fuera de cualquier transacción: bcrypt tarda decenas de
 * milisegundos. Fallar aquí no cuenta para el bloqueo de inicio de sesión (FR-024).
 * @returns {Promise<string>} el hash actual, para compararlo con la contraseña nueva.
 */
export async function verifyPassword(userId, password, field) {
  const found = await User.findById(userId).select('+password_hash');
  const hash = found?.password_hash;
  if (!hash || !(await bcrypt.compare(password, hash))) throw wrongPassword(field);
  return hash;
}

export function getAccount(req, res) {
  res.json(toAccount(req.user));
}

/** Cambia el nombre (FR-005) y lo audita; el mismo nombre no escribe nada (casos límite). */
export async function updateAccount(req, res) {
  const user = req.user;
  const { name } = req.validated.body;
  const previous = user.name;
  if (name !== previous) {
    await runInTransaction(async (session) => {
      await User.updateOne({ _id: user._id }, { $set: { name } }, { session });
      await record(
        {
          userId: user._id,
          action: 'update',
          entityType: 'user',
          entityId: user._id,
          entityLabel: name,
          before: { name: previous },
          after: { name },
        },
        session,
      );
    });
    user.name = name;
  }
  res.json(toAccount(user));
}

/**
 * Cambia la contraseña (FR-008 a FR-011): sube la versión de sesión, así que los tokens
 * anteriores dejan de valer, y emite uno nuevo para que esta sesión siga abierta.
 */
export async function changePassword(req, res) {
  const user = req.user;
  const { current_password: current, new_password: next } = req.validated.body;
  const hash = await verifyPassword(user._id, current, 'current_password');
  if (await bcrypt.compare(next, hash)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Datos no válidos', [
      { field: 'new_password', message: 'La nueva contraseña debe ser distinta de la actual' },
    ]);
  }
  const newHash = await bcrypt.hash(next, ENV.BCRYPT_ROUNDS);
  const updated = await runInTransaction(async (session) => {
    const doc = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { password_hash: newHash }, $inc: { session_version: 1 } },
      { new: true, session },
    );
    await record(
      {
        userId: user._id,
        action: 'update',
        entityType: 'user',
        entityId: user._id,
        entityLabel: user.name,
        before: null,
        // Solo consta que se cambió: nunca la contraseña ni su hash (FR-023).
        after: { password: 'changed' },
      },
      session,
    );
    return doc;
  });
  setSessionCookie(res, updated);
  res.status(204).end();
}

/** Borra la cuenta de forma definitiva tras confirmar la contraseña (FR-012 a FR-020). */
export async function deleteAccount(req, res) {
  const user = req.user;
  await verifyPassword(user._id, req.validated.body.password, 'password');
  await runInTransaction((session) => deleteAccountCascade(user, session));
  clearSessionCookie(res);
  res.status(204).end();
}

/** Descarga los datos de la cuenta en JSON (FR-021): bookia-mis-datos-AAAA-MM-DD.json. */
export async function exportAccount(req, res) {
  const data = await buildAccountExport(req.user);
  const filename = `bookia-mis-datos-${data.exported_at.slice(0, 10)}.json`;
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(data);
}
