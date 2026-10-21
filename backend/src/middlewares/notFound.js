import { HttpError } from '../utils/httpError.js';

export function notFound(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', `No existe la ruta ${req.method} ${req.path}`));
}
