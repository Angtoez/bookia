// Reservas (contracts/rest-api.md § Reservas).
import { apiRequest } from './apiClient.js';

const reservationPath = (id) => `/reservations/${encodeURIComponent(id)}`;

/** Reserva una unidad; 409 OUT_OF_STOCK, RESERVATION_LIMIT o DUPLICATE_RESERVATION. */
export const createReservation = ({ bookId, storeId }) =>
  apiRequest('/reservations', { method: 'POST', body: { book_id: bookId, store_id: storeId } });

/** "Mis reservas", de la más reciente a la más antigua. */
export const listMyReservations = ({ status, page, limit } = {}) =>
  apiRequest('/reservations/mine', { query: { status, page, limit } });

/** El titular o un administrador; 409 INVALID_TRANSITION si ya no está activa. */
export const cancelReservation = (id) =>
  apiRequest(`${reservationPath(id)}/cancel`, { method: 'POST' });

// Gestión (solo administradores).

export const listReservations = ({ status, store_id: storeId, page, limit } = {}) =>
  apiRequest('/reservations', { query: { status, store_id: storeId, page, limit } });

export const markReady = (id) => apiRequest(`${reservationPath(id)}/ready`, { method: 'POST' });

export const markPickedUp = (id) => apiRequest(`${reservationPath(id)}/pickup`, { method: 'POST' });
