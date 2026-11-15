const BASIS_POINTS = 10_000;
const HALF = BASIS_POINTS / 2;

/**
 * Impuesto en céntimos con redondeo half-up en aritmética entera (RB-05, ADR-006).
 * Espera enteros no negativos: `baseCents` y `rateBp` en 0..10000 los garantizan
 * el schema y el `CHECK` de la BD, no el dominio.
 */
export function taxCents(baseCents: number, rateBp: number): number {
  return Math.floor((baseCents * rateBp + HALF) / BASIS_POINTS);
}
