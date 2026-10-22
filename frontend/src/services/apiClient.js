// Cliente HTTP de la API: cookie de sesión, JSON y errores con el formato del contrato
// (contracts/rest-api.md § Convenciones).

export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

// Un 401 en estas rutas es una respuesta esperada, no una sesión caducada.
const AUTH_PROBES = ['/auth/login', '/auth/me'];

export class ApiError extends Error {
  /**
   * @param {number} status código HTTP.
   * @param {string} code código estable (VALIDATION_ERROR, NOT_FOUND…).
   * @param {string} message mensaje en español para mostrar al usuario.
   * @param {Array<{field: string, message: string}>} [details] errores por campo (solo en 400).
   */
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Errores por campo como objeto {campo: mensaje}, para los formularios. */
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

function buildUrl(path, query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `/api${path}${qs ? `?${qs}` : ''}`;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Llama a la API y devuelve el cuerpo JSON (o null en un 204).
 * @param {string} path ruta relativa a /api, p. ej. '/books'.
 * @param {{method?: string, body?: unknown, query?: Record<string, unknown>}} [options]
 */
export async function apiRequest(path, { method = 'GET', body, query } = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor');
  }

  if (response.status === 204) return null;
  const data = await readJson(response);
  if (response.ok) return data;

  if (response.status === 401 && !AUTH_PROBES.includes(path)) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  const error = data?.error ?? {};
  throw new ApiError(
    response.status,
    error.code ?? 'INTERNAL_ERROR',
    error.message ?? 'Ha ocurrido un error inesperado',
    error.details,
  );
}
