import { taxCents } from './money.ts';
import { calculateBase, type Tier } from './pricing.ts';

/** Resultado del cálculo de una simulación (RF-21, RF-22). */
export interface Quote {
  baseCents: number;
  taxCents: number;
  /** Siempre `baseCents + taxCents` (RB-05). */
  totalCents: number;
  tiers: Tier[];
}

/**
 * Cálculo único que comparten el preview y el guardado (RB-10).
 * `rateBp` es la tasa del país del cliente, que lee el service (RB-06).
 */
export function calculateQuote(users: number, rateBp: number): Quote {
  const { baseCents, tiers } = calculateBase(users);
  const tax = taxCents(baseCents, rateBp);
  return { baseCents, taxCents: tax, totalCents: baseCents + tax, tiers };
}
