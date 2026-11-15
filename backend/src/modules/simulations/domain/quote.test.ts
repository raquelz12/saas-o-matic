import { describe, expect, it } from 'vitest';
import { calculateBase } from './pricing.ts';
import { calculateQuote } from './quote.ts';

// Half-up de RB-05 escrito aparte de la implementación, para que la propiedad no se
// cumpla por construcción: redondea el cociente exacto y sube si el resto es ≥ la mitad.
const rb05Tax = (base: number, rateBp: number): number => {
  const product = base * rateBp;
  const quotient = Math.trunc(product / 10_000);
  return product % 10_000 >= 5000 ? quotient + 1 : quotient;
};

describe('calculateQuote', () => {
  it('CA-13: ES (2100), 15 usuarios → 14 000 / 2940 / 16 940', () => {
    expect(calculateQuote(15, 2100)).toEqual({
      baseCents: 14_000,
      taxCents: 2940,
      totalCents: 16_940,
      tiers: calculateBase(15).tiers,
    });
  });

  it('CA-14: DE (1900), 15 usuarios → 14 000 / 2660 / 16 660', () => {
    expect(calculateQuote(15, 1900)).toMatchObject({
      baseCents: 14_000,
      taxCents: 2660,
      totalCents: 16_660,
    });
  });

  it('CA-15: PT (2300), 1 usuario → 1000 / 230 / 1230', () => {
    expect(calculateQuote(1, 2300)).toMatchObject({
      baseCents: 1000,
      taxCents: 230,
      totalCents: 1230,
    });
  });

  it('CA-16: GB (2000), 51 usuarios → 42 500 / 8500 / 51 000', () => {
    expect(calculateQuote(51, 2000)).toMatchObject({
      baseCents: 42_500,
      taxCents: 8500,
      totalCents: 51_000,
    });
  });

  it('CA-17: IT (2200), 1000 usuarios → 517 000 / 113 740 / 630 740', () => {
    expect(calculateQuote(1000, 2200)).toMatchObject({
      baseCents: 517_000,
      taxCents: 113_740,
      totalCents: 630_740,
    });
  });

  it('CA-18: tasa 2105 bp, 1 usuario → impuesto 211, total 1211 (half-up de 210,5)', () => {
    expect(calculateQuote(1, 2105)).toMatchObject({
      baseCents: 1000,
      taxCents: 211,
      totalCents: 1211,
    });
  });

  it('devuelve los tramos de calculateBase sin modificarlos', () => {
    for (const users of [1, 10, 11, 50, 51, 1000]) {
      expect(calculateQuote(users, 2100).tiers).toEqual(calculateBase(users).tiers);
    }
  });

  it('RB-05: total = base + impuesto e impuesto half-up para todo u en 1..1000', () => {
    for (const rateBp of [0, 1900, 2100, 2105, 2300, 10_000]) {
      for (let users = 1; users <= 1000; users++) {
        const quote = calculateQuote(users, rateBp);
        expect(quote.baseCents).toBe(calculateBase(users).baseCents);
        expect(quote.taxCents).toBe(rb05Tax(quote.baseCents, rateBp));
        expect(quote.totalCents).toBe(quote.baseCents + quote.taxCents);
      }
    }
  });
});
