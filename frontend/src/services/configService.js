// Configuración pública y géneros (contracts/rest-api.md § Configuración).
import { apiRequest } from './apiClient.js';

// La configuración no cambia mientras la API está en marcha: se pide una sola vez.
let configPromise = null;

export function getConfig() {
  configPromise ??= apiRequest('/config').catch((error) => {
    configPromise = null;
    throw error;
  });
  return configPromise;
}

export const listGenres = () => apiRequest('/genres');

/** Solo para las pruebas: olvida la configuración cacheada. */
export function resetConfigCache() {
  configPromise = null;
}
