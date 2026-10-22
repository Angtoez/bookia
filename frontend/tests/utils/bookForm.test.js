import { describe, expect, it } from 'vitest';
import {
  EMPTY_BOOK_FORM,
  bookApiErrors,
  bookToForm,
  changedFields,
  formToInput,
  validateBookForm,
} from '../../src/utils/bookForm.js';
import { ApiError } from '../../src/services/apiClient.js';
import { isValidIsbn, normalizeIsbn } from '../../src/utils/isbn.js';
import { centsToAmountInput, parseAmountToCents } from '../../src/utils/money.js';
import { plural } from '../../src/utils/plural.js';
import { applyParamChanges, readPage } from '../../src/utils/searchParams.js';

const valid = {
  ...EMPTY_BOOK_FORM,
  title: ' Rayuela ',
  author: 'Julio Cortázar',
  genre_id: 'g1',
  isbn: '978-84-376-0494-7',
  price: '18,50',
};

describe('money', () => {
  it('convierte importes con coma o punto a céntimos sin errores de redondeo', () => {
    expect(parseAmountToCents('18,50')).toBe(1850);
    expect(parseAmountToCents('18.5')).toBe(1850);
    expect(parseAmountToCents(' 0 ')).toBe(0);
    expect(parseAmountToCents('19.99')).toBe(1999);
    expect(parseAmountToCents('1.005')).toBeNull();
  });

  it('rechaza negativos, texto y vacíos', () => {
    for (const value of ['-1', 'abc', '', '1,2,3', '12,', undefined]) {
      expect(parseAmountToCents(value)).toBeNull();
    }
  });

  it('céntimos a texto de formulario', () => {
    expect(centsToAmountInput(1850)).toBe('18,50');
    expect(centsToAmountInput(5)).toBe('0,05');
    expect(centsToAmountInput(-1)).toBe('');
  });
});

describe('isbn', () => {
  it('valida ISBN-10 e ISBN-13 con guiones y dígito de control', () => {
    expect(isValidIsbn('978-84-376-0494-7')).toBe(true);
    expect(isValidIsbn('0-306-40615-2')).toBe(true);
    expect(isValidIsbn('080442957X')).toBe(true);
    expect(isValidIsbn('9788437604948')).toBe(false);
    expect(isValidIsbn('12345')).toBe(false);
    expect(normalizeIsbn(' 978 84-376 ')).toBe('97884376');
  });
});

describe('validateBookForm', () => {
  it('un formulario completo es válido', () => {
    expect(validateBookForm(valid)).toEqual({});
  });

  it('marca obligatorios, ISBN mal formado y precio negativo (historia 2, escenario 3)', () => {
    const errors = validateBookForm({ ...EMPTY_BOOK_FORM, isbn: '123', price: '-5' });
    expect(Object.keys(errors).sort()).toEqual(['author', 'genre_id', 'isbn', 'price', 'title']);
    expect(errors.title).toBe('El título es obligatorio');
    expect(errors.isbn).toMatch(/ISBN no válido/);
  });

  it('comprueba longitudes y el año', () => {
    const now = new Date('2026-06-01');
    const errors = validateBookForm(
      { ...valid, title: 'x'.repeat(301), publication_year: '2028', publisher: 'p'.repeat(201) },
      now,
    );
    expect(errors.title).toBe('El título admite como máximo 300 caracteres');
    expect(errors.publication_year).toBe('Indica un año entre 1450 y 2027');
    expect(errors.publisher).toMatch(/200/);
    expect(validateBookForm({ ...valid, publication_year: '2027' }, now)).toEqual({});
  });
});

describe('conversión del formulario', () => {
  const book = {
    title: 'Rayuela',
    author: 'Julio Cortázar',
    genre: { id: 'g1' },
    isbn: '9788437604947',
    price_cents: 1850,
    publisher: '',
    publication_year: 1963,
    description: '',
  };

  it('ida y vuelta entre BookDetail y BookInput', () => {
    const form = bookToForm(book);
    expect(form.price).toBe('18,50');
    expect(form.publication_year).toBe('1963');
    expect(formToInput(form)).toMatchObject({
      genre_id: 'g1',
      price_cents: 1850,
      publication_year: 1963,
    });
    expect(formToInput({ ...form, publication_year: '' }).publication_year).toBeNull();
  });

  it('changedFields deja solo lo que cambia', () => {
    const original = formToInput(bookToForm(book));
    const edited = formToInput({ ...bookToForm(book), price: '20', title: ' Rayuela ' });
    expect(changedFields(edited, original)).toEqual({ price_cents: 2000 });
  });

  it('bookApiErrors lleva ISBN_TAKEN y los details a su campo', () => {
    expect(bookApiErrors(new ApiError(409, 'ISBN_TAKEN', 'Ya existe')).fields).toEqual({
      isbn: 'Ya existe',
    });
    const details = new ApiError(400, 'VALIDATION_ERROR', 'Datos no válidos', [
      { field: 'price_cents', message: 'Debe ser un número entero de céntimos' },
    ]);
    expect(bookApiErrors(details)).toEqual({
      fields: { price: 'Debe ser un número entero de céntimos' },
      general: null,
    });
    const other = new ApiError(500, 'INTERNAL_ERROR', 'Fallo');
    expect(bookApiErrors(other)).toEqual({ fields: {}, general: other });
  });
});

describe('utilidades de listados', () => {
  it('readPage y applyParamChanges', () => {
    expect(readPage('3')).toBe(3);
    expect(readPage('0')).toBe(1);
    const prev = new URLSearchParams('q=a&page=3');
    expect(applyParamChanges(prev, { q: 'b' }).toString()).toBe('q=b');
    expect(applyParamChanges(prev, { page: 1 }).toString()).toBe('q=a');
    expect(applyParamChanges(prev, { page: 4 }).toString()).toBe('q=a&page=4');
  });

  it('plural', () => {
    expect(plural(1, 'establecimiento')).toBe('1 establecimiento');
    expect(plural(0, 'establecimiento')).toBe('0 establecimientos');
    expect(plural(2, 'reserva activa', 'reservas activas')).toBe('2 reservas activas');
  });
});
