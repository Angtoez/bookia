// Auditoría (contracts/rest-api.md § Usuarios y auditoría). Solo lectura: no hay rutas de
// escritura, así que PUT, PATCH o DELETE responden 404 (FR-028).
import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditLogsController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { listAuditLogsQuerySchema } from '../validators/userValidators.js';

export function createAuditLogsRouter() {
  const router = Router();
  router.get(
    '/',
    authenticate,
    requireRole('admin'),
    validate({ query: listAuditLogsQuerySchema }),
    listAuditLogs,
  );
  return router;
}
