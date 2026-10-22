import { describe, expect, it } from 'vitest';
import { loginPathFor, safeNext } from '../../src/utils/safeNext.js';

describe('safeNext', () => {
  it('acepta rutas internas', () => {
    expect(safeNext('/books/1?x=1')).toBe('/books/1?x=1');
  });

  it('rechaza destinos externos, vacíos o el propio login', () => {
    const rejected = [null, '', 'https://evil.example', '//evil.example', '/\\evil', '/login'];
    for (const value of [...rejected, '/login?next=/x', '/register', '/register?next=%2F']) {
      expect(safeNext(value)).toBe('/');
    }
  });

  it('no confunde rutas que solo empiezan igual', () => {
    expect(safeNext('/loginhelp')).toBe('/loginhelp');
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
