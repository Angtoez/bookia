// Gestión de cuentas por el administrador: rol y estado, auditados (US7, FR-023 a FR-025).
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { record } from '../services/auditService.js';
import { deactivateUserCascade } from '../services/cascadeService.js';
import { runInTransaction } from '../services/transaction.js';
import { escapeRegExp } from '../utils/escapeRegExp.js';
import { HttpError, notFound } from '../utils/httpError.js';
import { paginate } from '../utils/pagination.js';
import { toUserAdmin } from '../utils/presenters.js';

// Un cambio de rol y uno de estado en la misma petición generan una entrada cada uno.
const AUDITED_FIELDS = [
  ['role', 'role_change'],
  ['status', 'status_change'],
];

const isActiveAdmin = ({ role, status }) => role === 'admin' && status === 'active';

export async function listUsers(req, res) {
  const { q, page, limit } = req.validated.query;
  const filter = {};
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const result = await paginate(User, filter, {
    sort: { created_at: -1, _id: -1 },
    page,
    limit,
  });
  res.json({ ...result, items: result.items.map(toUserAdmin) });
}

/**
 * Comprueba que queda otro administrador activo (FR-024). En lugar de solo contarlos, los
 * actualiza: dos degradaciones simultáneas escriben los mismos documentos, así que una de
 * las transacciones choca, se reintenta y ya ve el cambio de la otra.
 */
async function assertAnotherActiveAdmin(userId, session) {
  const { matchedCount } = await User.updateMany(
    { role: 'admin', status: 'active', _id: mongoose.trusted({ $ne: userId }) },
    { $currentDate: { updated_at: true } },
    { session, timestamps: false },
  );
  if (matchedCount === 0) {
    throw new HttpError(409, 'LAST_ADMIN', 'Debe quedar al menos un administrador activo');
  }
}

export async function updateUser(req, res) {
  const changes = req.validated.body;
  const user = await runInTransaction(async (session) => {
    const found = await User.findById(req.validated.params.id).session(session);
    if (!found) throw notFound('Usuario no encontrado');
    const current = { role: found.role, status: found.status };
    const next = { ...current, ...changes };
    if (isActiveAdmin(current) && !isActiveAdmin(next)) {
      await assertAnotherActiveAdmin(found._id, session);
    }

    found.set(next);
    await found.save({ session });
    if (current.status === 'active' && next.status === 'disabled') {
      await deactivateUserCascade(found._id, req.user._id, session);
    }

    let before = current;
    for (const [field, action] of AUDITED_FIELDS) {
      if (current[field] === next[field]) continue;
      const after = { ...before, [field]: next[field] };
      await record(
        {
          userId: req.user._id,
          action,
          entityType: 'user',
          entityId: found._id,
          entityLabel: found.name,
          before,
          after,
        },
        session,
      );
      before = after;
    }
    return found;
  });
  res.json(toUserAdmin(user));
}
