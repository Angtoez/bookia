// Sesión del usuario (contracts/rest-api.md § Autenticación).
import { apiRequest } from './apiClient.js';

export const login = (email, password) =>
  apiRequest('/auth/login', { method: 'POST', body: { email, password } });

/** Crea una cuenta con rol user; la API deja la sesión iniciada (historia 4, escenario 1). */
export const register = ({ name, email, password }) =>
  apiRequest('/auth/register', { method: 'POST', body: { name, email, password } });

export const logout = () => apiRequest('/auth/logout', { method: 'POST' });

/** Usuario de la sesión actual, o null si no hay sesión válida. */
export async function me() {
  try {
    return await apiRequest('/auth/me');
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}
