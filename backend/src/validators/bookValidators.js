// Validación de entrada de libros (FR-013 a FR-016).
import { z } from 'zod';
import { isValidIsbn } from '../utils/isbn.js';
import { centsSchema, objectIdSchema, paginationQuerySchema, trimmed } from './common.js';

// Un parámetro vacío (?q=) equivale a no enviarlo.
const emptyToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema);

export const listBooksQuerySchema = paginationQuerySchema.extend({
  q: emptyToUndefined(z.string().trim().min(1).max(100).optional()),
  genre: emptyToUndefined(
    z
      .string()
      .max(60)
      .regex(/^[a-z0-9-]+$/, 'Género no válido')
      .optional(),
  ),
});

const publicationYearSchema = z
  .number()
  .int()
  .min(1450)
  .refine((y) => y <= new Date().getFullYear() + 1, 'El año no puede estar en el futuro');

const bookFields = {
  title: trimmed(1, 300),
  author: trimmed(1, 200),
  genre_id: objectIdSchema,
  isbn: z.string().trim().max(20).refine(isValidIsbn, 'ISBN no válido'),
  price_cents: centsSchema,
  description: z.string().trim().max(5000).optional(),
  publisher: z.string().trim().max(200).optional(),
  publication_year: publicationYearSchema.nullable().optional(),
};

export const createBookSchema = z.strictObject(bookFields);

export const updateBookSchema = z
  .strictObject(bookFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Indica al menos un campo');
