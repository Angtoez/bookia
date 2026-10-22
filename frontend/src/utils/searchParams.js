// Lectura de parámetros de la URL compartida por los listados.

/** `page` de la URL como entero ≥ 1; cualquier otro valor es la primera página. */
export function readPage(value) {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * Aplica cambios a unos URLSearchParams: borra los vacíos y la página 1, y vuelve a la primera
 * página si cambia un filtro (cualquier clave salvo `page`).
 */
export function applyParamChanges(prev, changes) {
  const next = new URLSearchParams(prev);
  for (const [key, value] of Object.entries(changes)) {
    const empty = value === '' || value == null || (key === 'page' && value === 1);
    if (empty) next.delete(key);
    else next.set(key, String(value));
  }
  if (!('page' in changes) && Object.keys(changes).length > 0) next.delete('page');
  return next;
}
