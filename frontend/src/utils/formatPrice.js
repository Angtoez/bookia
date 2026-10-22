// Formatea un importe en céntimos enteros con la moneda de GET /api/config.
export function formatPrice(cents, currency) {
  // Sin moneda (la configuración aún no ha llegado) no se puede formatear.
  if (!Number.isFinite(cents) || !currency) return '';
  return new Intl.NumberFormat('es', { style: 'currency', currency }).format(cents / 100);
}
