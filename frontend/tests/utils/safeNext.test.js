import { describe, expect, it } from 'vitest';
import { loginPathFor, safeNext } from '../../src/utils/safeNext.js';

describe('safeNext', () => {
  it('acepta rutas internas', () => {
    expect(safeNext('/books/1?x=1')).toBe('/books/1?x=1');
  });

  it('rechaza destinos externos, vacíos o el propio login', () => {
    for (const value of [null, '', 'https://evil.example', '//evil.example', '/\\evil', '/login']) {
      expect(safeNext(value)).toBe('/');
    }
  });
});

describe('loginPathFor', () => {
  it('codifica la ruta actual en next', () => {
    expect(loginPathFor({ pathname: '/me/favorites', search: '?page=2' })).toBe(
      '/login?next=%2Fme%2Ffavorites%3Fpage%3D2',
    );
  });

  it('desde el login no añade next', () => {
    expect(loginPathFor({ pathname: '/login', search: '' })).toBe('/login');
  });
});
