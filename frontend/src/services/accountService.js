// Mi cuenta (feature 002, contracts/rest-api.md): todas las llamadas actúan sobre la cuenta de
// la sesión.
import { apiRequest } from './apiClient.js';

/** Descarga de los datos: un enlace normal con `download`; la cookie viaja sola (research R7). */
export const ACCOUNT_EXPORT_URL = '/api/account/export';

/** Account: {id, name, email, role, created_at}. */
export const getAccount = () => apiRequest('/account');

/** Cambia el nombre (FR-005); devuelve la Account actualizada. */
export const updateAccount = ({ name }) =>
  apiRequest('/account', { method: 'PATCH', body: { name } });

/** Cambia la contraseña (FR-008 a FR-011). La API renueva la cookie de esta sesión: 204. */
export const changePassword = ({ current_password, new_password }) =>
  apiRequest('/account/password', { method: 'POST', body: { current_password, new_password } });

/** Borra la cuenta de forma definitiva (FR-012 a FR-020); la API borra la cookie: 204. */
export const deleteAccount = ({ password }) =>
  apiRequest('/account', { method: 'DELETE', body: { password } });
