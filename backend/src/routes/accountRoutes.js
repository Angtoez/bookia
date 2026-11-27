// Mi cuenta (feature 002, contracts/rest-api.md). Ninguna ruta recibe un id: todas actúan sobre la
// cuenta de la sesión (FR-003). Las que piden la contraseña comparten un límite por IP (FR-024).
import { Router } from 'express';
import { getAccount, updateAccount } from '../controllers/accountController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { updateAccountSchema } from '../validators/accountValidators.js';

export function createAccountRouter() {
  const router = Router();
  router.use(authenticate, requireRole('user', 'admin'));

  router.get('/', getAccount);
  router.patch('/', validate({ body: updateAccountSchema }), updateAccount);
  return router;
}
