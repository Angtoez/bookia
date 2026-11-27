// Borrado y exportación de la propia cuenta (feature 002, research R4, R5 y R7).
import { AuditLog, DELETED_ACCOUNT_LABEL } from '../models/AuditLog.js';
import { Favorite } from '../models/Favorite.js';
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
