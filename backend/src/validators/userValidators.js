import { z } from 'zod';
import { AUDIT_ENTITY_TYPES } from '../models/AuditLog.js';
import { USER_ROLES, USER_STATUSES } from '../models/User.js';
import { paginationQuerySchema, trimmed } from './common.js';

// Búsqueda opcional por nombre o correo.
export const listUsersQuerySchema = paginationQuerySchema.extend({
  q: trimmed(1, 100).optional(),
});

export const updateUserSchema = z
  .strictObject({
    role: z.enum(USER_ROLES, 'Rol no válido').optional(),
    status: z.enum(USER_STATUSES, 'Estado no válido').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Indica al menos un campo');

// Auditoría: filtro opcional por tipo de elemento.
export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  entity_type: z.enum(AUDIT_ENTITY_TYPES, 'Tipo de elemento no válido').optional(),
});
