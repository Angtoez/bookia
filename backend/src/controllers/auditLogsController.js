// Consulta de la auditoría, solo lectura (US7, FR-028). Los autores se buscan aparte, sin
// populate, para distinguir una acción del sistema (sin user_id) de una cuenta borrada (con
// user_id pero sin documento; feature 002, research R5).
import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { paginate } from '../utils/pagination.js';
import { toAuditLog } from '../utils/presenters.js';

export async function listAuditLogs(req, res) {
  const { entity_type: entityType, page, limit } = req.validated.query;
  const filter = entityType ? { entity_type: entityType } : {};
  const result = await paginate(AuditLog, filter, {
    sort: { created_at: -1, _id: -1 },
    page,
    limit,
  });
  const ids = [
    ...new Set(
      result.items
        .map((log) => log.user_id)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const authors = ids.length
    ? await User.find({ _id: mongoose.trusted({ $in: ids }) }, 'name')
    : [];
  const usersById = new Map(authors.map((user) => [String(user._id), user]));
  res.json({ ...result, items: result.items.map((log) => toAuditLog(log, usersById)) });
}
