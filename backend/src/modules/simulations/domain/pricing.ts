/** Tramo aplicado en un cálculo (spec 5.2). */
export interface Tier {
  from: number;
  /** `null` en el último tramo, que no tiene límite superior. */
  to: number | null;
  units: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface BaseBreakdown {
  baseCents: number;
  /** Solo los tramos con `units > 0`, en orden ascendente. */
  tiers: Tier[];
}

interface TierDefinition {
  from: number;
  to: number | null;
  unitPriceCents: number;
}

/** Precios por tramo (RF-21, RB-02). Constantes del dominio, no se guardan en BD. */
const TIERS: readonly TierDefinition[] = [
  { from: 1, to: 10, unitPriceCents: 1000 },
  { from: 11, to: 50, unitPriceCents: 800 },
  { from: 51, to: null, unitPriceCents: 500 },
];

/**
 * Base mensual acumulativa por tramos (RB-01).
 * Espera un entero en 1..1000: el rango lo valida el schema, no el dominio.
 */
export function calculateBase(users: number): BaseBreakdown {
  const tiers: Tier[] = [];
  for (const { from, to, unitPriceCents } of TIERS) {
    const last = to === null ? users : Math.min(users, to);
    const units = Math.max(0, last - from + 1);
    if (units > 0) {
      tiers.push({ from, to, units, unitPriceCents, subtotalCents: units * unitPriceCents });
    }
  }
  const baseCents = tiers.reduce((sum, tier) => sum + tier.subtotalCents, 0);
  return { baseCents, tiers };
}
