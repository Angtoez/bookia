// Formulario de libro: conversión entre BookDetail, los campos del formulario y BookInput,
// y validación previa con las mismas reglas que la API (backend/src/validators/bookValidators.js).
import { apiFieldErrors, lengthError, requiredError } from './formHelpers.js';
import { isValidIsbn } from './isbn.js';
import { centsToAmountInput, parseAmountToCents } from './money.js';

export const EMPTY_BOOK_FORM = {
  title: '',
  author: '',
  genre_id: '',
  isbn: '',
  price: '',
  publisher: '',
  publication_year: '',
  description: '',
};

// Los details de la API usan los nombres de BookInput; el formulario pide `price`.
export const API_FIELD_TO_FORM = { price_cents: 'price' };

export function bookToForm(book) {
  return {
    title: book.title ?? '',
    author: book.author ?? '',
    genre_id: book.genre?.id ?? '',
    isbn: book.isbn ?? '',
    price: centsToAmountInput(book.price_cents),
    publisher: book.publisher ?? '',
    publication_year: book.publication_year == null ? '' : String(book.publication_year),
    description: book.description ?? '',
  };
}

/** BookInput a partir de un formulario ya validado. */
export function formToInput(form) {
  const year = form.publication_year.trim();
  return {
    title: form.title.trim(),
    author: form.author.trim(),
    genre_id: form.genre_id,
    isbn: form.isbn.trim(),
    price_cents: parseAmountToCents(form.price),
    publisher: form.publisher.trim(),
    publication_year: year ? Number(year) : null,
    description: form.description.trim(),
  };
}

/** Errores por campo del formulario, o {} si es válido. */
export function validateBookForm(form, now = new Date()) {
  const errors = {};
  const title = requiredError(form.title, 300, 'El título');
  if (title) errors.title = title;
  const author = requiredError(form.author, 200, 'El autor');
  if (author) errors.author = author;
  if (!form.genre_id) errors.genre_id = 'Elige un género';
  if (!form.isbn.trim()) errors.isbn = 'El ISBN es obligatorio';
  else if (!isValidIsbn(form.isbn)) {
    errors.isbn = 'ISBN no válido: revisa que tenga 10 o 13 dígitos y el dígito de control';
  }
  if (!form.price.trim()) errors.price = 'El precio es obligatorio';
  else if (parseAmountToCents(form.price) === null) {
    errors.price = 'Indica un importe mayor o igual que 0 con hasta dos decimales';
  }
  const year = form.publication_year.trim();
  if (year) {
    const value = Number(year);
    const maxYear = now.getFullYear() + 1;
    if (!/^\d{4}$/.test(year) || value < 1450 || value > maxYear) {
      errors.publication_year = `Indica un año entre 1450 y ${maxYear}`;
    }
  }
  const publisher = lengthError(form.publisher, 200, 'La editorial');
  if (publisher) errors.publisher = publisher;
  const description = lengthError(form.description, 5000, 'La descripción');
  if (description) errors.description = description;
  return errors;
}

/** Errores por campo a partir de un ApiError; `general` si no encaja en ningún campo. */
export function bookApiErrors(error) {
  if (error.code === 'ISBN_TAKEN') return { fields: { isbn: error.message }, general: null };
  return apiFieldErrors(error, Object.keys(EMPTY_BOOK_FORM), API_FIELD_TO_FORM);
}
