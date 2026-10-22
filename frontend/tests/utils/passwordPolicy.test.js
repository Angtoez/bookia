import { describe, expect, it } from 'vitest';
import { meetsPasswordPolicy } from '../../src/utils/passwordPolicy.js';

describe('meetsPasswordPolicy', () => {
  it('exige al menos 8 caracteres con letras y números, como la API', () => {
    expect(meetsPasswordPolicy('secreto123')).toBe(true);
    expect(meetsPasswordPolicy('a1b2c3d4')).toBe(true);
  });

  it('rechaza las contraseñas de los casos de prueba de la API', () => {
    for (const value of ['abcdefgh', '1234567', '12345678', '', 'a1'.repeat(101), undefined]) {
      expect(meetsPasswordPolicy(value)).toBe(false);
    }
  });
});
