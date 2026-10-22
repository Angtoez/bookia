// Stock y precio propio de un libro en una tienda (FR-019, FR-020a).
import { centsToAmountInput, parseAmountToCents } from './money.js';

export function parseStock(text) {
  const value = String(text ?? '').trim();
  return /^\d{1,7}$/.test(value) ? Number(value) : null;
}

/** Precio propio: vacío → null (se usa el de referencia); inválido → undefined. */
export function parseStorePrice(text) {
  const value = String(text ?? '').trim();
  if (!value) return null;
  return parseAmountToCents(value) ?? undefined;
}

export const storePriceToInput = (cents) => (cents == null ? '' : centsToAmountInput(cents));

/** Errores de los campos stock y price, o {} si son válidos. */
export function validateStoreBook({ stock, price }) {
  const errors = {};
  if (parseStock(stock) === null) errors.stock = 'Indica un número entero de unidades (0 o más)';
  if (parseStorePrice(price) === undefined) {
    errors.price = 'Indica un importe con hasta dos decimales o déjalo vacío';
  }
  return errors;
}
