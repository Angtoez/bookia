// Catálogo público (contracts/rest-api.md § Libros).
import { apiRequest } from './apiClient.js';

/** Página de BookSummary ordenada por título. */
export const listBooks = ({ q, genre, page, limit } = {}) =>
  apiRequest('/books', { query: { q, genre, page, limit } });

/** BookDetail con la disponibilidad en cada tienda. */
export const getBook = (id) => apiRequest(`/books/${encodeURIComponent(id)}`);

// Gestión del catálogo (solo administradores).

/** Crea un libro a partir de BookInput y devuelve su BookDetail. */
export const createBook = (input) => apiRequest('/books', { method: 'POST', body: input });

/** Actualiza solo los campos indicados. */
export const updateBook = (id, changes) =>
  apiRequest(`/books/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });

/** {stores, active_reservations, favorites} afectados si se borra el libro. */
export const getBookDeletionImpact = (id) =>
  apiRequest(`/books/${encodeURIComponent(id)}/deletionImpact`);

export const deleteBook = (id) =>
  apiRequest(`/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
