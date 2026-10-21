// Esquemas zod reutilizables por todos los recursos (research R5).
import { z } from 'zod';

// Mensajes de validación en español.
z.config(z.locales.es());

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador no válido');

export const idParamSchema = z.object({ id: objectIdSchema });

// Los parámetros de la query llegan como cadenas: se convierten a enteros.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// Cadena recortada con longitud mínima y máxima.
export const trimmed = (min, max) => z.string().trim().min(min).max(max);

// Importe en céntimos: entero mayor o igual que cero (FR-015).
export const centsSchema = z.number().int('Debe ser un número entero de céntimos').min(0);
