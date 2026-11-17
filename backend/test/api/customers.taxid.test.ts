import type { Express } from 'express';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';
import { customerBody, postCustomer } from '../helpers/customerFactory.ts';

/** Alta con este país e identificador; el resto de campos, los de la factoría. */
function postTaxId(app: Express, country: string, taxId: string, extra: object = {}) {
  return postCustomer(app, customerBody({ country, taxId, ...extra }));
}

async function expectCreated(country: string, taxId: string, stored = taxId) {
  const res = await postTaxId(createTestApp(), country, taxId);
  expect(res.status).toBe(201);
  expect(res.body.taxId).toBe(stored);
  expect(res.body.country).toBe(country);
}

async function expectTaxIdIssue(country: string, taxId: string, issue: string) {
  const res = await postTaxId(createTestApp(), country, taxId);
  expect(res.status).toBe(422);
  expect(res.body.error.details).toEqual([{ field: 'taxId', issue }]);
}

describe('POST /api/customers: identificador fiscal español', () => {
  it('CA-50: ES 12345678Z → 201 (DNI)', () => expectCreated('ES', '12345678Z'));

  it('CA-51: ES 12.345.678-z → 201, guardado como 12345678Z', () =>
    expectCreated('ES', '12.345.678-z', '12345678Z'));

  it('CA-52: ES 12345678A → 422 INVALID_CHECKSUM', () =>
    expectTaxIdIssue('ES', '12345678A', 'INVALID_CHECKSUM'));

  it.each(['X1234567L', 'Y1234567X', 'Z1234567R'])('CA-53: ES %s → 201 (NIE)', (taxId) =>
    expectCreated('ES', taxId),
  );

  it('CA-54: ES K1234567L → 201 (NIF especial)', () => expectCreated('ES', 'K1234567L'));

  it('CA-55: ES B12345674 → 201 (CIF, control dígito)', () => expectCreated('ES', 'B12345674'));

  it('CA-56: ES B1234567D → 422 INVALID_CHECKSUM (B exige dígito)', () =>
    expectTaxIdIssue('ES', 'B1234567D', 'INVALID_CHECKSUM'));

  it('CA-57: ES P1234567D → 201 (CIF, control letra)', () => expectCreated('ES', 'P1234567D'));

  it('CA-58: ES P12345674 → 422 INVALID_CHECKSUM (P exige letra)', () =>
    expectTaxIdIssue('ES', 'P12345674', 'INVALID_CHECKSUM'));

  it.each(['C12345674', 'C1234567D'])('CA-59: ES %s → 201 (control indistinto)', (taxId) =>
    expectCreated('ES', taxId),
  );

  it('CA-60: ES 1234567Z → 422 INVALID_FORMAT (no se rellena con ceros)', () =>
    expectTaxIdIssue('ES', '1234567Z', 'INVALID_FORMAT'));

  it('CA-61: ES I1234567A → 422 INVALID_FORMAT', () =>
    expectTaxIdIssue('ES', 'I1234567A', 'INVALID_FORMAT'));

  it('CA-62: ES ESB12345674 → 422 INVALID_FORMAT', () =>
    expectTaxIdIssue('ES', 'ESB12345674', 'INVALID_FORMAT'));
});

describe('POST /api/customers: identificador fiscal no español', () => {
  it('CA-63: FR FR12345678901 → 201 (validación genérica)', () =>
    expectCreated('FR', 'FR12345678901'));

  it('CA-64: FR 1234 → 422 INVALID_LENGTH', () => expectTaxIdIssue('FR', '1234', 'INVALID_LENGTH'));

  it('CA-65: FR AB_123 → 422 INVALID_FORMAT', () =>
    expectTaxIdIssue('FR', 'AB_123', 'INVALID_FORMAT'));
});

describe('POST /api/customers: unicidad fiscal', () => {
  it('CA-66: ES b-1234 5674 con B12345674 ya en ES → 409 DUPLICATE', async () => {
    const app = createTestApp();
    expect((await postTaxId(app, 'ES', 'B12345674')).status).toBe(201);
    const res = await postTaxId(app, 'ES', 'b-1234 5674');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: 'DUPLICATE',
        message: 'Resource already exists',
        details: [{ field: 'taxId', issue: 'DUPLICATE' }],
      },
    });
  });

  it('CA-67: FR B12345674 con B12345674 ya en ES → 201 (país distinto)', async () => {
    const app = createTestApp();
    expect((await postTaxId(app, 'ES', 'B12345674')).status).toBe(201);
    const res = await postTaxId(app, 'FR', 'B12345674');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ country: 'FR', taxId: 'B12345674' });
  });

  it('CA-68: ES A87654323 con el mismo email que otro cliente → 201', async () => {
    const app = createTestApp();
    const email = 'a@x.com';
    expect((await postTaxId(app, 'ES', 'B12345674', { email })).status).toBe(201);
    const res = await postTaxId(app, 'ES', 'A87654323', { email });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(email);
  });

  it('el nombre de empresa no es único (RB-12)', async () => {
    const app = createTestApp();
    expect((await postTaxId(app, 'ES', 'B12345674')).status).toBe(201);
    expect((await postTaxId(app, 'ES', 'A87654323')).status).toBe(201);
  });
});

describe('POST /api/customers: acumulación de errores', () => {
  it('CA-110: ES B1234567D con email no válido → 422 con los dos errores', async () => {
    const res = await postTaxId(createTestApp(), 'ES', 'B1234567D', { email: 'no-es-un-email' });
    expect(res.status).toBe(422);
    // Sin depender del orden del ejemplo de 5.3 (R-111).
    expect(res.body.error.details).toHaveLength(2);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'taxId', issue: 'INVALID_CHECKSUM' },
        { field: 'email', issue: 'INVALID_FORMAT' },
      ]),
    );
  });
});
