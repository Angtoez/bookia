// Favoritos del usuario con sesión (contracts/rest-api.md § Favoritos).
import { apiRequest } from './apiClient.js';

const favoritePath = (bookId) => `/favorites/${encodeURIComponent(bookId)}`;

/** Página de BookSummary con stores_available, del más reciente al más antiguo. */
export const listFavorites = ({ page, limit } = {}) =>
  apiRequest('/favorites', { query: { page, limit } });

/** Idempotente: 204 aunque ya fuera favorito. */
export const addFavorite = (bookId) => apiRequest(favoritePath(bookId), { method: 'PUT' });

/** Idempotente: 204 aunque no lo fuera. */
export const removeFavorite = (bookId) => apiRequest(favoritePath(bookId), { method: 'DELETE' });
