// Fila editable del inventario: stock y precio propio en línea, con errores por fila.
import { useState } from 'react';
import { formatPrice } from '../utils/formatPrice.js';
import {
  parseStock,
  parseStorePrice,
  storePriceToInput,
  validateStoreBook,
} from '../utils/storeBookForm.js';

const INPUT =
  'w-24 rounded-md border bg-white px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-1';
const BUTTON =
  'rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';

const toFields = (item) => ({
  stock: String(item.stock),
  price: storePriceToInput(item.store_price_cents),
});

/**
 * @param {{item: object, currency?: string,
 *   onSave: (item: object, changes: object) => Promise<void>, onRemove: (item: object) => void}} props
 *   onSave rechaza con el ApiError si la API no acepta el cambio.
 */
export function StoreBookRow({ item, currency, onSave, onRemove }) {
  const [fields, setFields] = useState(() => toFields(item));
  const [lastItem, setLastItem] = useState(item);
  const [errors, setErrors] = useState({});
  const [rowError, setRowError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Tras guardar, la lista recarga y la fila toma los valores nuevos.
  if (item !== lastItem) {
    setLastItem(item);
    setFields(toFields(item));
  }

  const changes = {};
  const stock = parseStock(fields.stock);
  const price = parseStorePrice(fields.price);
  if (stock !== null && stock !== item.stock) changes.stock = stock;
  if (price !== undefined && price !== (item.store_price_cents ?? null)) {
    changes.store_price_cents = price;
  }
  const dirty =
    fields.stock !== String(item.stock) ||
    fields.price !== storePriceToInput(item.store_price_cents);

  const update = (event) => {
    setFields({ ...fields, [event.target.name]: event.target.value });
    setErrors({});
    setRowError(null);
  };

  const save = async () => {
    const fieldErrors = validateStoreBook(fields);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0 || Object.keys(changes).length === 0) return;
    setSaving(true);
    try {
      await onSave(item, changes);
    } catch (error) {
      // STOCK_BELOW_RESERVED y similares: se muestran con el mensaje de la API.
      const details = error.fieldErrors ?? {};
      setErrors({ stock: details.stock, price: details.store_price_cents });
      setRowError(Object.keys(details).length > 0 ? null : error);
    } finally {
      setSaving(false);
    }
  };

  const errorId = `row-${item.book_id}-error`;
  const tone = (field) =>
    errors[field]
      ? 'border-red-500 focus-visible:outline-red-600'
      : 'border-stone-300 focus-visible:outline-primary-700';
  const describedBy = errors.stock || errors.price || rowError ? errorId : undefined;

  return (
    <tr className="align-top">
      <th scope="row" className="px-4 py-3 text-left font-normal">
        <span className="block font-medium text-stone-900">{item.title}</span>
        <span className="block text-xs text-stone-600">{item.author}</span>
        <span className="block font-mono text-xs text-stone-500">{item.isbn}</span>
        {(errors.stock || errors.price || rowError) && (
          <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">
            {errors.stock ?? errors.price ?? rowError?.message}
          </p>
        )}
      </th>
      <td className="px-4 py-3">
        <input
          name="stock"
          inputMode="numeric"
          aria-label={`Stock de «${item.title}»`}
          aria-invalid={errors.stock ? true : undefined}
          aria-describedby={describedBy}
          value={fields.stock}
          onChange={update}
          className={`${INPUT} ${tone('stock')}`}
        />
      </td>
      <td className="px-4 py-3 text-right text-stone-700">{item.reserved_count}</td>
      <td className="px-4 py-3 text-right font-medium text-stone-900">{item.available}</td>
      <td className="px-4 py-3">
        <input
          name="price"
          inputMode="decimal"
          aria-label={`Precio en la tienda de «${item.title}»`}
          aria-invalid={errors.price ? true : undefined}
          aria-describedby={describedBy}
          placeholder="Referencia"
          value={fields.price}
          onChange={update}
          className={`${INPUT} ${tone('price')}`}
        />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap text-stone-900">
        {formatPrice(item.effective_price_cents, currency)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            aria-label={`Guardar «${item.title}»`}
            className={`${BUTTON} border-primary-700 bg-primary-700 text-white hover:bg-primary-800 focus-visible:outline-primary-700`}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={saving}
            aria-label={`Quitar «${item.title}»`}
            className={`${BUTTON} border-red-300 text-red-800 hover:bg-red-50 focus-visible:outline-red-700`}
          >
            Quitar
          </button>
        </div>
      </td>
    </tr>
  );
}
