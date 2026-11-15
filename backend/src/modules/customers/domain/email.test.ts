import { describe, expect, it } from 'vitest';
import { normalizeEmail, validateEmailLength } from './email.ts';

describe('normalizeEmail', () => {
  it('quita espacios iniciales y finales y pasa a minúsculas', () => {
    expect(normalizeEmail('  Compras@PenaHermanos.ES \t')).toBe('compras@penahermanos.es');
  });

  it('no valida el formato (es de z.email() en el schema)', () => {
    expect(normalizeEmail('No-Es-Un-Email')).toBe('no-es-un-email');
  });
});

describe('validateEmailLength', () => {
  const domain = '@example.com';

  it('CA-45: email de 255 caracteres → INVALID_LENGTH', () => {
    const email = 'a'.repeat(255 - domain.length) + domain;
    expect(validateEmailLength(normalizeEmail(email))).toBe('INVALID_LENGTH');
  });

  it('254 caracteres → OK (límite incluido)', () => {
    const email = 'a'.repeat(254 - domain.length) + domain;
    expect(validateEmailLength(normalizeEmail(email))).toBe('OK');
  });

  it('cuenta code points, no unidades UTF-16', () => {
    expect(validateEmailLength('🚀'.repeat(254 - domain.length) + domain)).toBe('OK');
    expect(validateEmailLength('🚀'.repeat(255 - domain.length) + domain)).toBe('INVALID_LENGTH');
  });
});
