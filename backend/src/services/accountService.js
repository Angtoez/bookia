// Borrado y exportación de la propia cuenta (feature 002, research R4, R5 y R7).
import { AuditLog, DELETED_ACCOUNT_LABEL } from '../models/AuditLog.js';
import { Favorite } from '../models/Favorite.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { assertAnotherActiveAdmin } from './adminGuard.js';
import { record } from './auditService.js';
import { cancelActiveFor } from './reservationTransitions.js';

const LAST_ADMIN_SELF_MESSAGE = 'No puedes borrar tu cuenta: eres el último administrador activo';

/**
 * Borra la cuenta dentro de la transacción `session` (FR-012 a FR-020). Las reservas activas se
 * cancelan liberando sus unidades, los favoritos se borran y la auditoría que la menciona pierde
 * su nombre y su correo. Las reservas cerradas se conservan: su user_id deja de apuntar a nadie.
 */
export async function deleteAccountCascade(user, session) {
  if (user.role === 'admin' && user.status === 'active') {
    await assertAnotherActiveAdmin(user._id, session, LAST_ADMIN_SELF_MESSAGE);
  }
  await cancelActiveFor({ user_id: user._id }, 'account_deleted', user._id, session);
  await Favorite.deleteMany({ user_id: user._id }).session(session);
  // Lo único que guardaba el nombre o el correo eran las entradas sobre la propia cuenta.
  await AuditLog.anonymizeAccount(user._id, session);
  await record(
    {
      userId: user._id,
      action: 'delete',
      entityType: 'user',
      entityId: user._id,
      entityLabel: DELETED_ACCOUNT_LABEL,
      before: { role: user.role, created_at: user.created_at },
    },
    session,
  );
  await User.deleteOne({ _id: user._id }).session(session);
}

const orNull = (value) => value ?? null;

/**
 * Datos de la cuenta para descargar (FR-021, FR-022, data-model § Exportación). Se construye campo
 * a campo, sin copiar documentos, para que no se cuele ningún dato interno ni de seguridad.
 */
export async function buildAccountExport(user) {
  const [reservations, favorites] = await Promise.all([
    Reservation.find({ user_id: user._id })
      .sort({ created_at: -1, _id: -1 })
      .populate('book_id', 'isbn')
      .lean(),
    Favorite.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .populate('book_id', 'title author isbn')
      .lean(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    account: { name: user.name, email: user.email, role: user.role, created_at: user.created_at },
    reservations: reservations.map((r) => ({
      book_title: r.book_title,
      // null si el libro ya no está en el catálogo.
      book_isbn: r.book_id?.isbn ?? null,
      store_name: r.store_name,
      store_address: r.store_address,
      price_cents: r.price_cents,
      status: r.status,
      cancel_reason: orNull(r.cancel_reason),
      created_at: r.created_at,
      ready_at: orNull(r.ready_at),
      expires_at: orNull(r.expires_at),
      closed_at: orNull(r.closed_at),
    })),
    // Un libro borrado desaparece de los favoritos (FR-022i de la 001).
    favorites: favorites
      .filter((f) => f.book_id)
      .map((f) => ({
        title: f.book_id.title,
        author: f.book_id.author,
        isbn: f.book_id.isbn,
        added_at: f.created_at,
      })),
  };
}
