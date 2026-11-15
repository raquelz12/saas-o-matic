import { describe, expect, it } from 'vitest';
import { taxCents } from './money.ts';

describe('taxCents', () => {
  it.each([
    { base: 14_000, rateBp: 2100, tax: 2940 },
    { base: 14_000, rateBp: 1900, tax: 2660 },
    { base: 1000, rateBp: 2300, tax: 230 },
    { base: 42_500, rateBp: 2000, tax: 8500 },
    { base: 517_000, rateBp: 2200, tax: 113_740 },
  ])('RB-07: base $base, tasa $rateBp bp → impuesto $tax', ({ base, rateBp, tax }) => {
    expect(taxCents(base, rateBp)).toBe(tax);
  });

  it('RB-08: base 1000, tasa 2105 bp → 210,5 → impuesto 211', () => {
    expect(taxCents(1000, 2105)).toBe(211);
  });

  it('half-up: x,5 redondea hacia arriba (1 × 0,5 → 1)', () => {
    expect(taxCents(1, 5000)).toBe(1);
  });

  it('half-up: x,5 redondea hacia arriba también con parte entera (3 × 0,5 = 1,5 → 2)', () => {
    expect(taxCents(3, 5000)).toBe(2);
  });

  it('half-up: x,4999 redondea hacia abajo (1 × 0,4999 → 0)', () => {
    expect(taxCents(1, 4999)).toBe(0);
  });

  it('half-up: x,5001 redondea hacia arriba (1 × 0,5001 → 1)', () => {
    expect(taxCents(1, 5001)).toBe(1);
  });

  it('tasa 0 bp → impuesto 0', () => {
    expect(taxCents(517_000, 0)).toBe(0);
  });

  it('tasa 10 000 bp (máximo del CHECK) → impuesto igual a la base', () => {
    expect(taxCents(517_000, 10_000)).toBe(517_000);
  });

  it('devuelve siempre un entero', () => {
    for (const rateBp of [0, 1, 1999, 2105, 3333, 9999, 10_000]) {
      for (const base of [1000, 10_800, 42_500, 517_000]) {
        expect(Number.isInteger(taxCents(base, rateBp))).toBe(true);
      }
    }
  });
});
