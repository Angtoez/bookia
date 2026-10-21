// Límite de peticiones en /api/auth/* por IP (research R4). Se crea uno por instancia de la app.
import rateLimit from 'express-rate-limit';
import { HttpError } from '../utils/httpError.js';

export function createAuthRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new HttpError(429, 'TOO_MANY_REQUESTS', 'Demasiados intentos; prueba más tarde'));
    },
  });
}
