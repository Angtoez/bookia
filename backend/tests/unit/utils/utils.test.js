import { describe, expect, it } from 'vitest';
import { escapeRegExp } from '../../../src/utils/escapeRegExp.js';
import { isValidIsbn, normalizeIsbn } from '../../../src/utils/isbn.js';
import { normalizeSearch } from '../../../src/utils/normalizeSearch.js';
import { buildPage, parsePagination } from '../../../src/utils/pagination.js';

describe('isbn', () => {
  it('normaliza guiones, espacios y la X minúscula', () => {
    expect(normalizeIsbn('84-376-0494-x')).toBe('843760494X');
    expect(normalizeIsbn(' 978 0 307 47472 8 ')).toBe('9780307474728');
  });

  it('acepta ISBN-10 con X y rechaza un dígito de control erróneo', () => {
    expect(isValidIsbn('0-8044-2957-X')).toBe(true);
    expect(isValidIsbn('0-8044-2957-1')).toBe(false);
    expect(isValidIsbn('X804429571')).toBe(false);
  });

  it('valida ISBN-13 con o sin guiones', () => {
    expect(isValidIsbn('978-0-307-47472-8')).toBe(true);
    expect(isValidIsbn('9780307474729')).toBe(false);
    expect(isValidIsbn('12345')).toBe(false);
    expect(isValidIsbn(null)).toBe(false);
  });
});

describe('normalizeSearch', () => {
  it('quita mayúsculas, tildes y espacios repetidos', () => {
    expect(normalizeSearch('  Cien   AÑOS ')).toBe('cien anos');
    expect(normalizeSearch('Pedro Páramo')).toBe('pedro paramo');
    expect(normalizeSearch(undefined)).toBe('');
  });
});

describe('escapeRegExp', () => {
  it('escapa los caracteres especiales para buscar el texto literal', () => {
    const pattern = new RegExp(escapeRegExp('.*('));
    expect(pattern.test('a.*(b')).toBe(true);
    expect(pattern.test('abc')).toBe(false);
  });
});

describe('pagination', () => {
  it('aplica los valores por defecto y el máximo', () => {
    expect(parsePagination()).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination({ page: 3, limit: 500 })).toEqual({ page: 3, limit: 50, skip: 100 });
    expect(parsePagination({ page: 0, limit: -1 })).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('calcula total_pages', () => {
    expect(buildPage([], 41, 1, 20)).toEqual({
      items: [],
      page: 1,
      limit: 20,
      total: 41,
      total_pages: 3,
    });
  });
});
