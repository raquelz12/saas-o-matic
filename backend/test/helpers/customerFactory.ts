import type { Express } from 'express';
import request from 'supertest';

/** Body de `POST /customers` tal como lo enviaría un cliente HTTP (sin normalizar). */
export type CustomerBody = Record<string, unknown>;

/** Body válido por defecto (CIF `B12345674`, spec 3.6.7); `overrides` sustituye campos. */
export function customerBody(overrides: CustomerBody = {}): CustomerBody {
  return {
    companyName: 'Acme SL',
    taxId: 'B12345674',
    email: 'compras@acme.es',
    country: 'ES',
    plan: 'STARTER',
    ...overrides,
  };
}

/** Body válido sin el campo indicado (CA-49). */
export function customerBodyWithout(field: string): CustomerBody {
  const body = customerBody();
  delete body[field];
  return body;
}

/** `POST /api/customers` con `Content-Type: application/json`. */
export function postCustomer(app: Express, body: unknown = customerBody()) {
  return request(app)
    .post('/api/customers')
    .send(body as object);
}
