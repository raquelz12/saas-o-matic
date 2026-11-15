import { describe, expect, it } from 'vitest';
import { validateSpanishTaxId } from './taxId.ts';

describe('validateSpanishTaxId: DNI', () => {
  it('CA-50: 12345678Z → OK (12345678 mod 23 = 14 → Z)', () => {
    expect(validateSpanishTaxId('12345678Z')).toBe('OK');
  });

  it('CA-52: 12345678A → INVALID_CHECKSUM (se espera Z)', () => {
    expect(validateSpanishTaxId('12345678A')).toBe('INVALID_CHECKSUM');
  });

  it('CA-60: 1234567Z (8 caracteres) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('1234567Z')).toBe('INVALID_FORMAT');
  });

  it('3.6.7: 00000000T → OK (no hay lista negra)', () => {
    expect(validateSpanishTaxId('00000000T')).toBe('OK');
  });

  it('3.6.7: 123456789 (control dígito) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('123456789')).toBe('INVALID_FORMAT');
  });

  it('3.6.7: 12345678U (U fuera de la tabla de 23 letras) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('12345678U')).toBe('INVALID_FORMAT');
  });

  it('3.6.8: 1234567L (menos de 8 dígitos, no se rellena con ceros) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('1234567L')).toBe('INVALID_FORMAT');
  });

  it('posición central que no es dígito (1234A678Z) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('1234A678Z')).toBe('INVALID_FORMAT');
  });
});

describe('validateSpanishTaxId: NIE', () => {
  it.each([
    { taxId: 'X1234567L', calc: '01234567 mod 23 = 19 → L' },
    { taxId: 'Y1234567X', calc: '11234567 mod 23 = 10 → X' },
    { taxId: 'Z1234567R', calc: '21234567 mod 23 = 1 → R' },
  ])('CA-53: $taxId → OK ($calc)', ({ taxId }) => {
    expect(validateSpanishTaxId(taxId)).toBe('OK');
  });

  it('3.6.7: X0000000T → OK (no hay lista negra)', () => {
    expect(validateSpanishTaxId('X0000000T')).toBe('OK');
  });

  it('control que no coincide (X1234567A) → INVALID_CHECKSUM', () => {
    expect(validateSpanishTaxId('X1234567A')).toBe('INVALID_CHECKSUM');
  });

  it('posición central que no es dígito (X12A4567L) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('X12A4567L')).toBe('INVALID_FORMAT');
  });
});

describe('validateSpanishTaxId: NIF especial (K, L, M)', () => {
  it('CA-54: K1234567L → OK (1234567 mod 23 = 19 → L)', () => {
    expect(validateSpanishTaxId('K1234567L')).toBe('OK');
  });

  it.each(['L1234567L', 'M1234567L'])('%s → OK (la letra inicial no aporta valor)', (taxId) => {
    expect(validateSpanishTaxId(taxId)).toBe('OK');
  });

  it('control que no coincide (K1234567A) → INVALID_CHECKSUM', () => {
    expect(validateSpanishTaxId('K1234567A')).toBe('INVALID_CHECKSUM');
  });

  it('control fuera de la tabla de 23 letras (K1234567U) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('K1234567U')).toBe('INVALID_FORMAT');
  });

  it('posición central que no es dígito (K12345A7L) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('K12345A7L')).toBe('INVALID_FORMAT');
  });
});

describe('validateSpanishTaxId: detección del tipo', () => {
  it('CA-61: I1234567A (letra inicial no válida) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('I1234567A')).toBe('INVALID_FORMAT');
  });

  it('CA-62: ESB12345674 (11 caracteres, prefijo ES) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('ESB12345674')).toBe('INVALID_FORMAT');
  });

  it.each(['T1234567A', 'O1234567A'])('%s (letra inicial no válida) → INVALID_FORMAT', (taxId) => {
    expect(validateSpanishTaxId(taxId)).toBe('INVALID_FORMAT');
  });

  it('10 caracteres (123456789Z) → INVALID_FORMAT', () => {
    expect(validateSpanishTaxId('123456789Z')).toBe('INVALID_FORMAT');
  });
});
