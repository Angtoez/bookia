// Valida body, params y query con esquemas zod y deja el resultado en req.validated.
// En Express 5 req.query es de solo lectura, así que no se sobrescribe.
import { HttpError } from '../utils/httpError.js';

const PARTS = ['body', 'params', 'query'];

export function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};
    const details = [];
    for (const part of PARTS) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.') || part, message: issue.message });
        }
      }
    }
    if (details.length > 0) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Datos no válidos', details);
    }
    req.validated = validated;
    next();
  };
}
