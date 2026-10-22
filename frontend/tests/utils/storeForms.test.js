import { describe, expect, it } from 'vitest';
import { ApiError } from '../../src/services/apiClient.js';
import {
  parseStock,
  parseStorePrice,
  storePriceToInput,
  validateStoreBook,
} from '../../src/utils/storeBookForm.js';
import {
  EMPTY_STORE_FORM,
  formToStoreInput,
  storeApiErrors,
  storeToForm,
  validateStoreForm,
} from '../../src/utils/storeForm.js';

describe('storeForm', () => {
  it('convierte entre Store y formulario', () => {
    const form = storeToForm({ name: 'A', address: 'B', opening_hours: 'C', phone: null });
    expect(form.phone).toBe('');
    expect(formToStoreInput({ ...form, name: ' A ', phone: ' 555 ' })).toEqual({
      name: 'A',
      address: 'B',
      opening_hours: 'C',
      phone: '555',
    });
  });

  it('valida longitudes, obligatorios y teléfono', () => {
    expect(Object.keys(validateStoreForm(EMPTY_STORE_FORM)).sort()).toEqual([
      'address',
      'name',
      'opening_hours',
    ]);
    const long = { name: 'x'.repeat(151), address: 'a', opening_hours: 'h', phone: '+34 (91) 1-2' };
    expect(validateStoreForm(long)).toEqual({
      name: 'El nombre admite como máximo 150 caracteres',
    });
    expect(validateStoreForm({ ...long, name: 'n', phone: 'x' }).phone).toMatch(/dígitos/);
  });

  it('reparte los details y deja el resto como error general', () => {
    const details = new ApiError(400, 'VALIDATION_ERROR', 'x', [{ field: 'phone', message: 'm' }]);
    expect(storeApiErrors(details)).toEqual({ fields: { phone: 'm' }, general: null });
    const other = new ApiError(500, 'INTERNAL_ERROR', 'x');
    expect(storeApiErrors(other).general).toBe(other);
  });
});

describe('storeBookForm', () => {
  it('stock entero ≥ 0', () => {
    expect(parseStock('0')).toBe(0);
    expect(parseStock(' 12 ')).toBe(12);
    for (const value of ['-1', '1.5', '', 'a']) expect(parseStock(value)).toBeNull();
  });

  it('precio propio: vacío es null e inválido es undefined', () => {
    expect(parseStorePrice('')).toBeNull();
    expect(parseStorePrice('18,5')).toBe(1850);
    expect(parseStorePrice('x')).toBeUndefined();
    expect(storePriceToInput(null)).toBe('');
    expect(storePriceToInput(1850)).toBe('18,50');
  });

  it('validateStoreBook', () => {
    expect(validateStoreBook({ stock: '3', price: '' })).toEqual({});
    expect(Object.keys(validateStoreBook({ stock: '-1', price: 'x' }))).toEqual(['stock', 'price']);
  });
});
