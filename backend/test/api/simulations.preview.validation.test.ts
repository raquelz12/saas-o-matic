import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createTestApp } from '../helpers/createTestApp.ts';
import { createCustomerId, postPreview, simulationBody } from '../helpers/simulationFactory.ts';

/** 422 con exactamente estos `details`. */
function expectValidation(res: request.Response, details: { field: string; issue: string }[]) {
  expect(res.status).toBe(422);
  expect(res.body).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
  });
}

describe('POST /api/simulations/preview: validación (spec 3.4, 6.4)', () => {
  let app: Express;
  let customerId: number;

  beforeAll(async () => {
    app = createTestApp();
    customerId = await createCustomerId(app);
  });

  it.each([
    ['CA-09', 0],
    ['CA-10', 1001],
  ])('%s: users = %i → 422 users OUT_OF_RANGE', async (_ca, users) => {
    const res = await postPreview(app, simulationBody({ customerId, users }));
    expectValidation(res, [{ field: 'users', issue: 'OUT_OF_RANGE' }]);
  });

  it('CA-28: "users": "10" → 422 INVALID_TYPE', async () => {
    const res = await postPreview(app, simulationBody({ customerId, users: '10' }));
    expectValidation(res, [{ field: 'users', issue: 'INVALID_TYPE' }]);
  });

  it('CA-29: "users": 10.5 → 422 INVALID_TYPE', async () => {
    const res = await postPreview(app, simulationBody({ customerId, users: 10.5 }));
    expectValidation(res, [{ field: 'users', issue: 'INVALID_TYPE' }]);
  });

  it('CA-30: "users": 10.0 se acepta como 10', async () => {
    const res = await request(app)
      .post('/api/simulations/preview')
      .set('Content-Type', 'application/json')
      .send(`{"customerId":${customerId},"users":10.0,"storageGb":0,"apiCallsPerMonth":0}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ users: 10, baseCents: 10_000 });
  });

  it('CA-31: "storageGb": -1 → 422 OUT_OF_RANGE', async () => {
    const res = await postPreview(app, simulationBody({ customerId, storageGb: -1 }));
    expectValidation(res, [{ field: 'storageGb', issue: 'OUT_OF_RANGE' }]);
  });

  it('CA-32: "storageGb": 0 y "apiCallsPerMonth": 0 se aceptan', async () => {
    const res = await postPreview(
      app,
      simulationBody({ customerId, storageGb: 0, apiCallsPerMonth: 0 }),
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ storageGb: 0, apiCallsPerMonth: 0 });
  });

  it('CA-33: "storageGb": 100001 → 422 OUT_OF_RANGE', async () => {
    const res = await postPreview(app, simulationBody({ customerId, storageGb: 100_001 }));
    expectValidation(res, [{ field: 'storageGb', issue: 'OUT_OF_RANGE' }]);
  });

  it('CA-34: "apiCallsPerMonth": 1000001 → 422 OUT_OF_RANGE', async () => {
    const res = await postPreview(app, simulationBody({ customerId, apiCallsPerMonth: 1_000_001 }));
    expectValidation(res, [{ field: 'apiCallsPerMonth', issue: 'OUT_OF_RANGE' }]);
  });

  it('CA-35: users ausente → 422 REQUIRED', async () => {
    const body = simulationBody({ customerId });
    delete body['users'];
    expectValidation(await postPreview(app, body), [{ field: 'users', issue: 'REQUIRED' }]);
  });

  it('CA-35: users null → 422 REQUIRED', async () => {
    const res = await postPreview(app, simulationBody({ customerId, users: null }));
    expectValidation(res, [{ field: 'users', issue: 'REQUIRED' }]);
  });

  it('CA-36: campo extra "discount": 10 → 422 UNKNOWN_FIELD', async () => {
    const res = await postPreview(app, simulationBody({ customerId, discount: 10 }));
    expectValidation(res, [{ field: 'discount', issue: 'UNKNOWN_FIELD' }]);
  });

  it('CA-37: varios campos inválidos → un elemento en details por cada error', async () => {
    const res = await postPreview(app, {
      customerId: '1',
      users: 0,
      storageGb: 1.5,
      apiCallsPerMonth: -1,
      discount: 10,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveLength(5);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'customerId', issue: 'INVALID_TYPE' },
        { field: 'users', issue: 'OUT_OF_RANGE' },
        { field: 'storageGb', issue: 'INVALID_TYPE' },
        { field: 'apiCallsPerMonth', issue: 'OUT_OF_RANGE' },
        { field: 'discount', issue: 'UNKNOWN_FIELD' },
      ]),
    );
  });
});

describe('POST /api/simulations/preview: customerId, body y query', () => {
  const app = createTestApp();

  it.each([
    ['"1"', '1', 'INVALID_TYPE'],
    ['0', 0, 'OUT_OF_RANGE'],
    ['2147483648', 2_147_483_648, 'OUT_OF_RANGE'],
    ['true', true, 'INVALID_TYPE'],
  ])('customerId = %s → 422 %s', async (_label, customerId, issue) => {
    const res = await postPreview(app, simulationBody({ customerId }));
    expectValidation(res, [{ field: 'customerId', issue }]);
  });

  it('customerId = 2147483647 es válido: 404 si no existe', async () => {
    const res = await postPreview(app, simulationBody({ customerId: 2_147_483_647 }));
    expect(res.status).toBe(404);
  });

  it.each([
    ['[]', []],
    ['null', null],
    ['42', 42],
  ])('body %s → 422 body INVALID_TYPE', async (_label, body) => {
    const res = await request(app)
      .post('/api/simulations/preview')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(body));
    expectValidation(res, [{ field: 'body', issue: 'INVALID_TYPE' }]);
  });

  it('?foo=1 → 422 UNKNOWN_FIELD, acumulado con los errores del body', async () => {
    const res = await request(app)
      .post('/api/simulations/preview?foo=1')
      .send(simulationBody({ users: 0 }));
    expectValidation(res, [
      { field: 'foo', issue: 'UNKNOWN_FIELD' },
      { field: 'users', issue: 'OUT_OF_RANGE' },
    ]);
  });
});
