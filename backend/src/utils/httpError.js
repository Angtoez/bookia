// Error HTTP con el formato de contracts/rest-api.md § Convenciones.
export class HttpError extends Error {
  /**
   * @param {number} status código HTTP.
   * @param {string} code código estable para el cliente (VALIDATION_ERROR, NOT_FOUND…).
   * @param {string} message mensaje en español.
   * @param {Array<{field: string, message: string}>} [details] errores por campo (solo en 400).
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (message = 'Recurso no encontrado') =>
  new HttpError(404, 'NOT_FOUND', message);

export const fieldError = (field, message) =>
  new HttpError(400, 'VALIDATION_ERROR', 'Datos no válidos', [{ field, message }]);
