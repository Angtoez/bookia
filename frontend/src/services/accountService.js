// Mi cuenta (feature 002, contracts/rest-api.md): todas las llamadas actúan sobre la cuenta de
// la sesión.
import { apiRequest } from './apiClient.js';

/** Descarga de los datos: un enlace normal con `download`; la cookie viaja sola (research R7). */
export const ACCOUNT_EXPORT_URL = '/api/account/export';

/** Account: {id, name, email, role, created_at}. */
export const getAccount = () => apiRequest('/account');
