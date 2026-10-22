// Conversión entre el importe que escribe el administrador ("18,50" o "18.50") y céntimos
// enteros, sin pasar por coma flotante (FR-015).
const AMOUNT_PATTERN = /^(\d{1,9})(?:[.,](\d{1,2}))?$/;

/** Céntimos enteros, o null si el texto no es un importe ≥ 0 con hasta dos decimales. */
export function parseAmountToCents(text) {
  const match = AMOUNT_PATTERN.exec(String(text ?? '').trim());
  if (!match) return null;
  const [, units, decimals = ''] = match;
  return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

/** Céntimos → texto para un campo de formulario ("1850" → "18,50"). */
export function centsToAmountInput(cents) {
  if (!Number.isInteger(cents) || cents < 0) return '';
  const units = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${units},${rest}`;
}
