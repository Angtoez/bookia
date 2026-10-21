// Escribe entradas de auditoría dentro de la transacción de la operación (research R11).
import { AuditLog } from '../models/AuditLog.js';

const HIDDEN_FIELDS = ['password_hash', '__v'];

/** Convierte un documento a objeto plano sin datos sensibles ni campos derivados. */
export function toSnapshot(value) {
  if (value == null) return null;
  const plain =
    typeof value.toObject === 'function'
      ? value.toObject({ depopulate: true, versionKey: false })
      : { ...value };
  for (const key of Object.keys(plain)) {
    if (HIDDEN_FIELDS.includes(key) || key.endsWith('_search')) delete plain[key];
  }
  return plain;
}

/**
 * Registra una operación crítica.
 * @param {{userId: any, action: string, entityType: string, entityId: any,
 *   entityLabel?: string, before?: any, after?: any}} entry
 * @param {import('mongoose').ClientSession} session
 */
export async function record(entry, session) {
  const [log] = await AuditLog.create(
    [
      {
        user_id: entry.userId ?? null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        entity_label: entry.entityLabel ?? '',
        before: toSnapshot(entry.before),
        after: toSnapshot(entry.after),
      },
    ],
    { session },
  );
  return log;
}
