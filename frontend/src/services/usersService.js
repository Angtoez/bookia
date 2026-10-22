// Gestión de usuarios (contracts/rest-api.md § Usuarios y auditoría; solo administradores).
import { apiRequest } from './apiClient.js';

/** Página de {id, name, email, role, status, created_at}; q busca en nombre y correo. */
export const listUsers = ({ q, page, limit } = {}) =>
  apiRequest('/users', { query: { q, page, limit } });

/** {role?, status?}; 409 LAST_ADMIN si dejaría el sistema sin administradores activos. */
export const updateUser = (id, changes) =>
  apiRequest(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
