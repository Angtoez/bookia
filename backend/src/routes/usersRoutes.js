// Gestión de usuarios (contracts/rest-api.md § Usuarios y auditoría, solo admin).
import { Router } from 'express';
import { listUsers, updateUser } from '../controllers/usersController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/common.js';
import { listUsersQuerySchema, updateUserSchema } from '../validators/userValidators.js';

export function createUsersRouter() {
  const router = Router();
  router.use(authenticate, requireRole('admin'));

  router.get('/', validate({ query: listUsersQuerySchema }), listUsers);
  router.patch('/:id', validate({ params: idParamSchema, body: updateUserSchema }), updateUser);
  return router;
}
