// Mi cuenta: autoservicio de la cuenta de la sesión (feature 002). Siempre actúa sobre req.user:
// ninguna operación recibe un id, así que no puede tocar otra cuenta (FR-003).
import { User } from '../models/User.js';
import { record } from '../services/auditService.js';
import { runInTransaction } from '../services/transaction.js';
import { toAccount } from '../utils/presenters.js';

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
