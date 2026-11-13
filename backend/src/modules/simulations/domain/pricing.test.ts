import { describe, expect, it } from 'vitest';
import { calculateBase, type Tier } from './pricing.ts';

const tier1 = (units: number): Tier => ({
  from: 1,
  to: 10,
  units,
  unitPriceCents: 1000,
  subtotalCents: units * 1000,
});
const tier2 = (units: number): Tier => ({
  from: 11,
  to: 50,
  units,
  unitPriceCents: 800,
  subtotalCents: units * 800,
});
const tier3 = (units: number): Tier => ({
  from: 51,
  to: null,
  units,
  unitPriceCents: 500,
  subtotalCents: units * 500,
});

// RB-01, escrita aparte de la implementación para que CA-12 no sea tautológico.
const rb01 = (u: number): number =>
  1000 * Math.min(u, 10) + 800 * Math.max(0, Math.min(u, 50) - 10) + 500 * Math.max(0, u - 50);

describe('calculateBase', () => {
  it('CA-01: 1 usuario → 1000 / [1–10: 1 u]', () => {
    expect(calculateBase(1)).toEqual({ baseCents: 1000, tiers: [tier1(1)] });
  });

  it('CA-02: 10 usuarios → 10 000 / [1–10: 10 u]', () => {
    expect(calculateBase(10)).toEqual({ baseCents: 10_000, tiers: [tier1(10)] });
  });

  it('CA-03: 11 usuarios → 10 800 / [1–10: 10 u, 11–50: 1 u]', () => {
    expect(calculateBase(11)).toEqual({ baseCents: 10_800, tiers: [tier1(10), tier2(1)] });
  });

  it('CA-04: 15 usuarios → 14 000 / [1–10: 10 u, 11–50: 5 u]', () => {
    expect(calculateBase(15)).toEqual({ baseCents: 14_000, tiers: [tier1(10), tier2(5)] });
  });

  it('CA-05: 50 usuarios → 42 000 / [1–10: 10 u, 11–50: 40 u]', () => {
    expect(calculateBase(50)).toEqual({ baseCents: 42_000, tiers: [tier1(10), tier2(40)] });
  });

  it('CA-06: 51 usuarios → 42 500 / [1–10: 10 u, 11–50: 40 u, 51+: 1 u]', () => {
    expect(calculateBase(51)).toEqual({
      baseCents: 42_500,
      tiers: [tier1(10), tier2(40), tier3(1)],
    });
  });

  it('RB-03: 100 usuarios → 67 000', () => {
    expect(calculateBase(100).baseCents).toBe(67_000);
  });

  it('CA-07: 500 usuarios → 267 000', () => {
    expect(calculateBase(500).baseCents).toBe(267_000);
  });

  it('CA-08: 1000 usuarios → 517 000', () => {
    expect(calculateBase(1000).baseCents).toBe(517_000);
  });

  it('CA-12: para todo u en 1..1000, Σ subtotales = base (y base = RB-01, Σ units = u)', () => {
    for (let u = 1; u <= 1000; u++) {
      const { baseCents, tiers } = calculateBase(u);
      const sumSubtotals = tiers.reduce((acc, t) => acc + t.subtotalCents, 0);
      const sumUnits = tiers.reduce((acc, t) => acc + t.units, 0);
      expect(sumSubtotals, `u=${u}`).toBe(baseCents);
      expect(baseCents, `u=${u}`).toBe(rb01(u));
      expect(sumUnits, `u=${u}`).toBe(u);
      expect(
        tiers.every((t) => t.units > 0),
        `u=${u}`,
      ).toBe(true);
    }
  });
});
