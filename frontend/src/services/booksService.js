// Catálogo público (contracts/rest-api.md § Libros).
import { apiRequest } from './apiClient.js';

/** Página de BookSummary ordenada por título. */
export const listBooks = ({ q, genre, page, limit } = {}) =>
  apiRequest('/books', { query: { q, genre, page, limit } });

/** BookDetail con la disponibilidad en cada tienda. */
export const getBook = (id) => apiRequest(`/books/${encodeURIComponent(id)}`);
