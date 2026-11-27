// Mi cuenta (feature 002, contracts/rest-api.md). Ninguna ruta recibe un id: todas actúan sobre la
// cuenta de la sesión (FR-003). Las que piden la contraseña comparten un límite por IP (FR-024).
import { Router } from 'express';
import { changePassword, getAccount, updateAccount } from '../controllers/accountController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { createAuthRateLimit } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { changePasswordSchema, updateAccountSchema } from '../validators/accountValidators.js';

export function createAccountRouter() {
  const router = Router();
  // Una instancia propia, compartida por las rutas que piden la contraseña.
  const passwordRateLimit = createAuthRateLimit();
  router.use(authenticate, requireRole('user', 'admin'));

  router.get('/', getAccount);
  router.patch('/', validate({ body: updateAccountSchema }), updateAccount);
  router.post(
    '/password',
    passwordRateLimit,
    validate({ body: changePasswordSchema }),
    changePassword,
  );
  return router;
}
