// Validación de entrada de puntos de venta e inventario (FR-018 a FR-020a).
import { z } from 'zod';
import { PHONE_PATTERN } from '../models/Store.js';
import { centsSchema, objectIdSchema, trimmed } from './common.js';

const phoneSchema = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'El teléfono solo admite dígitos, espacios, +, - y ()')
    .nullable()
    .optional(),
);

const storeFields = {
  name: trimmed(1, 150),
  address: trimmed(1, 300),
  opening_hours: trimmed(1, 300),
  phone: phoneSchema,
};

const nonEmpty = (data) => Object.keys(data).length > 0;
const NON_EMPTY_MESSAGE = 'Indica al menos un campo';

export const createStoreSchema = z.strictObject(storeFields);

export const updateStoreSchema = z
  .strictObject(storeFields)
  .partial()
  .refine(nonEmpty, NON_EMPTY_MESSAGE);

const stockSchema = z.number().int('El stock debe ser un número entero').min(0);

export const storeBookCreateSchema = z.strictObject({
  book_id: objectIdSchema,
  stock: stockSchema,
  store_price_cents: centsSchema.nullable().optional(),
});

// store_price_cents: null quita el precio propio de la tienda.
export const storeBookUpdateSchema = z
  .strictObject({
    stock: stockSchema.optional(),
    store_price_cents: centsSchema.nullable().optional(),
  })
  .refine(nonEmpty, NON_EMPTY_MESSAGE);

export const storeBookParamsSchema = z.object({ id: objectIdSchema, bookId: objectIdSchema });
