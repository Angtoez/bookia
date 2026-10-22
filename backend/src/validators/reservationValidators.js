import { z } from 'zod';
import { RESERVATION_STATUSES } from '../models/Reservation.js';
import { objectIdSchema, paginationQuerySchema } from './common.js';

export const createReservationSchema = z.object({
  book_id: objectIdSchema,
  store_id: objectIdSchema,
});

const statusSchema = z.enum(RESERVATION_STATUSES, 'Estado de reserva no válido');

// "Mis reservas": filtro opcional por estado.
export const listMyReservationsQuerySchema = paginationQuerySchema.extend({
  status: statusSchema.optional(),
});

// Listado de administración: estado y tienda opcionales.
export const listReservationsQuerySchema = listMyReservationsQuerySchema.extend({
  store_id: objectIdSchema.optional(),
});
