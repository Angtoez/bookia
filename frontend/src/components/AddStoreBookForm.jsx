// Asocia un libro a una tienda con su stock y, opcionalmente, un precio propio (historia 3).
import { useState } from 'react';
import { BookPicker } from './BookPicker.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';
import { FormField } from './FormField.jsx';
import { parseStock, parseStorePrice, validateStoreBook } from '../utils/storeBookForm.js';

const EMPTY = { stock: '1', price: '' };

/**
 * @param {{currency?: string, excludedIds?: Set<string>,
 *   onAdd: (input: {book_id: string, stock: number, store_price_cents: number|null}) => Promise<void>,
 *   onCancel: () => void}} props
 *   onAdd rechaza con el ApiError (p. ej. 409 ALREADY_ASSOCIATED) si la API no lo acepta.
 */
export function AddStoreBookForm({ currency, excludedIds, onAdd, onCancel }) {
  const [book, setBook] = useState(null);
  const [fields, setFields] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setFields({ ...fields, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGeneralError(null);
    const fieldErrors = validateStoreBook(fields);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onAdd({
        book_id: book.id,
        stock: parseStock(fields.stock),
        store_price_cents: parseStorePrice(fields.price),
      });
    } catch (error) {
      const details = error.fieldErrors ?? {};
      setErrors({ stock: details.stock, price: details.store_price_cents });
      setGeneralError(Object.keys(details).length > 0 ? null : error);
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="add-store-book"
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-4"
    >
      <h2 id="add-store-book" className="text-lg font-semibold text-stone-900">
        Añadir un libro
      </h2>
      {!book ? (
        <BookPicker onSelect={setBook} excludedIds={excludedIds} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <p className="flex flex-wrap items-center gap-2 text-sm text-stone-800">
            <span>
              Libro: <strong>{book.title}</strong> · {book.author}
            </span>
            <button
              type="button"
              onClick={() => setBook(null)}
              className="rounded-sm font-medium text-primary-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
            >
              Cambiar
            </button>
          </p>
          <ErrorMessage error={generalError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Unidades"
              name="stock"
              inputMode="numeric"
              required
              value={fields.stock}
              onChange={update}
              error={errors.stock}
            />
            <FormField
              label={currency ? `Precio en la tienda (${currency})` : 'Precio en la tienda'}
              name="price"
              inputMode="decimal"
              hint="Déjalo vacío para usar el precio de referencia."
              value={fields.price}
              onChange={update}
              error={errors.price}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:opacity-60"
            >
              {submitting ? 'Añadiendo…' : 'Añadir al inventario'}
            </button>
          </div>
        </form>
      )}
      {!book && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}
