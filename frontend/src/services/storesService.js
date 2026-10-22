// Puntos de venta e inventario (contracts/rest-api.md § Puntos de venta; solo administradores).
import { apiRequest } from './apiClient.js';

const storePath = (id) => `/stores/${encodeURIComponent(id)}`;
const storeBookPath = (storeId, bookId) =>
  `${storePath(storeId)}/books/${encodeURIComponent(bookId)}`;

/** Página de Store ordenada por nombre (la API no admite búsqueda). */
export const listStores = ({ page, limit } = {}) =>
  apiRequest('/stores', { query: { page, limit } });

export const getStore = (id) => apiRequest(storePath(id));

export const createStore = (input) => apiRequest('/stores', { method: 'POST', body: input });

export const updateStore = (id, changes) =>
  apiRequest(storePath(id), { method: 'PATCH', body: changes });

/** {books, active_reservations} afectados si se borra la tienda. */
export const getStoreDeletionImpact = (id) => apiRequest(`${storePath(id)}/deletionImpact`);

export const deleteStore = (id) => apiRequest(storePath(id), { method: 'DELETE' });

/** Página de StoreBookItem ordenada por título. */
export const listStoreBooks = (storeId, { page, limit } = {}) =>
  apiRequest(`${storePath(storeId)}/books`, { query: { page, limit } });

/** {book_id, stock, store_price_cents?}; 409 ALREADY_ASSOCIATED si ya está. */
export const addStoreBook = (storeId, input) =>
  apiRequest(`${storePath(storeId)}/books`, { method: 'POST', body: input });

/** {stock?, store_price_cents?}; store_price_cents: null quita el precio propio. */
export const updateStoreBook = (storeId, bookId, changes) =>
  apiRequest(storeBookPath(storeId, bookId), { method: 'PATCH', body: changes });

/** 409 HAS_ACTIVE_RESERVATIONS si quedan unidades reservadas. */
export const removeStoreBook = (storeId, bookId) =>
  apiRequest(storeBookPath(storeId, bookId), { method: 'DELETE' });
