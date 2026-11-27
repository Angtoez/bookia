// Guarda del último administrador activo (FR-024 de la 001). La comparten la gestión de usuarios y
// el borrado de la propia cuenta (feature 002, research R4).
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

export const LAST_ADMIN_MESSAGE = 'Debe quedar al menos un administrador activo';

/**
 * Comprueba que queda otro administrador activo. En lugar de solo contarlos, los actualiza: dos
 * operaciones simultáneas escriben los mismos documentos, así que una de las transacciones
 * choca, se reintenta y ya ve el cambio de la otra.
 * @param {any} userId administrador que deja de serlo, se desactiva o se borra.
 * @param {import('mongoose').ClientSession} session
 * @param {string} [message] mensaje del error 409 LAST_ADMIN.
 */
export async function assertAnotherActiveAdmin(userId, session, message = LAST_ADMIN_MESSAGE) {
  const { matchedCount } = await User.updateMany(
    { role: 'admin', status: 'active', _id: mongoose.trusted({ $ne: userId }) },
    { $currentDate: { updated_at: true } },
    { session, timestamps: false },
  );
  if (matchedCount === 0) throw new HttpError(409, 'LAST_ADMIN', message);
}
