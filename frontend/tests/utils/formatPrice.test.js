import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../../src/utils/formatDate.js';
import { formatPrice } from '../../src/utils/formatPrice.js';

// Intl separa importe y símbolo con un espacio duro: se normaliza para comparar.
const plain = (text) => text.replace(/\s/g, ' ');

describe('formatPrice', () => {
  it('convierte céntimos a la moneda indicada', () => {
    expect(plain(formatPrice(1999, 'EUR'))).toBe('19,99 €');
    expect(plain(formatPrice(0, 'EUR'))).toBe('0,00 €');
    expect(formatPrice(25000, 'MXN')).toMatch(/250,00/);
  });

  it('devuelve una cadena vacía sin importe o sin moneda', () => {
    expect(formatPrice(undefined, 'EUR')).toBe('');
    expect(formatPrice(Number.NaN, 'EUR')).toBe('');
    expect(formatPrice(1000, undefined)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formatea fechas ISO y objetos Date', () => {
    const iso = '2026-10-22T10:30:00.000Z';
    expect(formatDateTime(iso)).toBe(formatDateTime(new Date(iso)));
    expect(formatDateTime(iso)).toMatch(/2026/);
  });

  it('devuelve una cadena vacía si no hay fecha o no es válida', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('no es una fecha')).toBe('');
  });
});
