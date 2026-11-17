import { z } from 'zod';

/** Máximo de `customerId` (spec 3.4): el entero de 32 bits con signo, como `:id` (spec 3.5). */
const MAX_CUSTOMER_ID = 2_147_483_647;

/**
 * Entero JSON en `[min, max]` (spec 3.4). Un string, un decimal o un booleano →
 * `INVALID_TYPE`; fuera de rango → `OUT_OF_RANGE`. `10.0` llega ya como 10 (spec 1.7).
 */
function intInRange(min: number, max: number) {
  return z.int().min(min).max(max);
}

/**
 * Body de `POST /simulations` y `POST /simulations/preview` (spec 3.4, 5.8, 5.9).
 * Estricto: cualquier otra clave → `UNKNOWN_FIELD` (CA-36).
 */
export const simulationSchema = z.strictObject({
  customerId: intInRange(1, MAX_CUSTOMER_ID),
  users: intInRange(1, 1000),
  storageGb: intInRange(0, 100_000),
  apiCallsPerMonth: intInRange(0, 1_000_000),
});

export type SimulationInput = z.output<typeof simulationSchema>;
