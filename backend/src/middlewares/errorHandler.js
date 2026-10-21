// Traduce cualquier error al formato {"error": {code, message, details?}} sin exponer trazas.
import mongoose from 'mongoose';
import { HttpError } from '../utils/httpError.js';

// Índice único violado (código 11000) → código de negocio según los campos del índice.
const DUPLICATE_CODES = [
  { fields: ['email'], code: 'EMAIL_TAKEN', message: 'Ese correo ya está registrado' },
  { fields: ['isbn'], code: 'ISBN_TAKEN', message: 'Ya existe un libro con ese ISBN' },
  {
    fields: ['book_id', 'store_id'],
    code: 'ALREADY_ASSOCIATED',
    message: 'El libro ya está asociado a este establecimiento',
  },
];

function fromDuplicateKey(err) {
  const keys = Object.keys(err.keyPattern ?? err.keyValue ?? {})
    .sort()
    .join();
  const match = DUPLICATE_CODES.find((d) => d.fields.join() === keys);
  if (match) return new HttpError(409, match.code, match.message);
  return new HttpError(409, 'CONFLICT', 'El registro ya existe');
}

function toHttpError(err) {
  if (err instanceof HttpError) return err;
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.entries(err.errors).map(([field, e]) => ({
      field,
      message: e.message,
    }));
    return new HttpError(400, 'VALIDATION_ERROR', 'Datos no válidos', details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return new HttpError(400, 'VALIDATION_ERROR', 'Datos no válidos', [
      { field: err.path, message: 'Valor no válido' },
    ]);
  }
  if (err?.code === 11000) return fromDuplicateKey(err);
  // Errores de body-parser: JSON mal formado o cuerpo demasiado grande.
  if (err?.type === 'entity.parse.failed') {
    return new HttpError(400, 'VALIDATION_ERROR', 'El cuerpo no es un JSON válido');
  }
  if (err?.type === 'entity.too.large') {
    return new HttpError(400, 'VALIDATION_ERROR', 'El cuerpo es demasiado grande');
  }
  return null;
}

// Express identifica los manejadores de errores por sus cuatro parámetros.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let httpError = toHttpError(err);
  if (!httpError) {
    console.error('Error inesperado:', err);
    httpError = new HttpError(500, 'INTERNAL_ERROR', 'Error interno del servidor');
  }
  const body = { code: httpError.code, message: httpError.message };
  if (httpError.status === 400 && httpError.details) body.details = httpError.details;
  res.status(httpError.status).json({ error: body });
}
