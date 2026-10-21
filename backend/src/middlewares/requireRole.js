// Control de acceso por roles (principio II): siempre después de authenticate.
import { HttpError } from '../utils/httpError.js';

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'No tienes permiso para realizar esta acción');
    }
    next();
  };
}
