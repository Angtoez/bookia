// Textos de la auditoría y cálculo de los campos que cambian en cada entrada (US7).

export const ENTITY_TYPES = ['book', 'store', 'store_book', 'user', 'reservation'];

const ENTITY_LABELS = {
  book: 'Libro',
  store: 'Establecimiento',
  store_book: 'Inventario',
  user: 'Usuario',
  reservation: 'Reserva',
};

const ACTION_LABELS = {
  create: 'Alta',
  update: 'Modificación',
  delete: 'Baja',
  status_change: 'Cambio de estado',
  role_change: 'Cambio de rol',
};

export const entityTypeLabel = (type) => ENTITY_LABELS[type] ?? type;
export const auditActionLabel = (action) => ACTION_LABELS[action] ?? action;

// Campos técnicos que no aportan nada al leer un cambio.
const IGNORED_FIELDS = new Set(['_id', 'id', '__v', 'created_at', 'updated_at']);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Campos que cambian entre `before` y `after`. En un alta solo hay `after` y en una baja solo
 * `before`: entonces se listan todos sus campos.
 * @returns {Array<{field: string, before: unknown, after: unknown}>}
 */
export function auditChanges(before, after) {
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes = [];
  for (const field of [...fields].sort()) {
    if (IGNORED_FIELDS.has(field)) continue;
    const from = before?.[field];
    const to = after?.[field];
    if (before && after && same(from, to)) continue;
    changes.push({ field, before: from, after: to });
  }
  return changes;
}

/** Valor legible: "—" si no hay valor; objetos y listas en JSON. */
export function formatAuditValue(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  return String(value);
}

export const ROLE_LABELS = { user: 'Usuario', admin: 'Administrador' };
export const USER_STATUS_LABELS = { active: 'Activa', disabled: 'Desactivada' };
