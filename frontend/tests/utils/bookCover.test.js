import { describe, expect, it } from 'vitest';
import { COVER_PALETTE, NO_GENRE_COLOR, coverColor, coverUrl } from '../../src/utils/bookCover.js';

describe('coverUrl', () => {
  it('construye la URL de Open Library con el ISBN normalizado', () => {
    expect(coverUrl('978-0-307-47472-8')).toBe(
      'https://covers.openlibrary.org/b/isbn/9780307474728-M.jpg?default=false',
    );
    expect(coverUrl('9780307474728', 'L')).toMatch(/9780307474728-L\.jpg/);
    expect(coverUrl('0307474720')).toMatch(/0307474720-M\.jpg/);
  });

  it('devuelve null si el ISBN falta o no es válido', () => {
    expect(coverUrl(undefined)).toBeNull();
    expect(coverUrl('')).toBeNull();
    expect(coverUrl('9780307474729')).toBeNull();
  });
});

describe('coverColor', () => {
  it('asigna a cada género predefinido un color de la paleta', () => {
    expect(coverColor({ slug: 'novela' })).toBe('bg-teal-700');
    expect(COVER_PALETTE).toContain(coverColor({ slug: 'ciencia-ficcion' }));
  });

  it('da siempre el mismo color de la paleta a un género nuevo', () => {
    const color = coverColor({ slug: 'genero-nuevo' });
    expect(COVER_PALETTE).toContain(color);
    expect(coverColor({ slug: 'genero-nuevo' })).toBe(color);
  });

  it('usa un gris neutro sin género', () => {
    expect(coverColor(null)).toBe(NO_GENRE_COLOR);
    expect(coverColor({})).toBe(NO_GENRE_COLOR);
  });
});
