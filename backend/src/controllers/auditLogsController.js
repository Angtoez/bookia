// Consulta de la auditoría, solo lectura (US7, FR-028).
import { AuditLog } from '../models/AuditLog.js';
import { paginate } from '../utils/pagination.js';
import { toAuditLog } from '../utils/presenters.js';

export async function listAuditLogs(req, res) {
  const { entity_type: entityType, page, limit } = req.validated.query;
  const filter = entityType ? { entity_type: entityType } : {};
  const result = await paginate(AuditLog, filter, {
    sort: { created_at: -1, _id: -1 },
    populate: { path: 'user_id', select: 'name' },
    page,
    limit,
  });
  res.json({ ...result, items: result.items.map(toAuditLog) });
}
