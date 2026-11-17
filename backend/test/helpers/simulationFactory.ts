import type { Express } from 'express';
import request from 'supertest';
import { customerBody, postCustomer } from './customerFactory.ts';

/** Body de `POST /simulations` y `/simulations/preview` tal como lo enviaría un cliente HTTP. */
export type SimulationBody = Record<string, unknown>;

/** Body válido por defecto (ejemplo de la spec 5.8); `overrides` sustituye campos. */
export function simulationBody(overrides: SimulationBody = {}): SimulationBody {
  return { customerId: 1, users: 15, storageGb: 200, apiCallsPerMonth: 50000, ...overrides };
}

/** `POST /api/simulations/preview` con `Content-Type: application/json`. */
export function postPreview(app: Express, body: unknown = simulationBody()) {
  return request(app)
    .post('/api/simulations/preview')
    .send(body as object);
}

/**
 * Da de alta un cliente del país indicado y devuelve su `id`. Fuera de ES el
 * identificador solo pasa el formato genérico; en ES, `taxId` debe ser válido (spec 3.6).
 */
export async function createCustomerId(
  app: Express,
  overrides: Record<string, unknown> = {},
): Promise<number> {
  const res = await postCustomer(app, customerBody(overrides));
  if (res.status !== 201) throw new Error(`Customer setup failed: ${res.status}`);
  return (res.body as { id: number }).id;
}
