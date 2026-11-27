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

// Los géneros son de solo lectura en la API (se cargan con el seed): también se piden una vez,
// aunque los usen a la vez el menú y el catálogo.
let genresPromise = null;

export function listGenres() {
  genresPromise ??= apiRequest('/genres').catch((error) => {
    genresPromise = null;
    throw error;
  });
  return genresPromise;
}

/** Solo para las pruebas: olvida la configuración y los géneros cacheados. */
export function resetConfigCache() {
  configPromise = null;
  genresPromise = null;
}
