import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { createAuthRateLimit } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../validators/authValidators.js';

export function createAuthRouter() {
  const router = Router();
  const authRateLimit = createAuthRateLimit();
  router.post('/login', authRateLimit, validate({ body: loginSchema }), login);
  router.post('/logout', logout);
  router.get('/me', authenticate, requireRole('user', 'admin'), me);
  return router;
}
