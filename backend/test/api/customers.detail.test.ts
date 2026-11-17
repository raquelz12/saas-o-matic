import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';
import { customerBody, postCustomer } from '../helpers/customerFactory.ts';

/** 422 con exactamente estos `details`. */
function expectValidation(res: request.Response, details: { field: string; issue: string }[]) {
  expect(res.status).toBe(422);
  expect(res.body).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
  });
}

/** Error sin `details` (spec 5.1). */
function expectBareError(res: request.Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ error: { code, message: expect.any(String), details: [] } });
}

describe('GET /api/customers/:id', () => {
  it('devuelve 200 con el mismo Customer que el 201 del alta, sin company_name_search', async () => {
    const app = createTestApp();
    const created = await postCustomer(app, customerBody({ companyName: '  Peña   Hermanos SA ' }));
    expect(created.status).toBe(201);

    const res = await request(app).get(`/api/customers/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
    expect(Object.keys(res.body).sort()).toEqual(
      ['companyName', 'country', 'createdAt', 'email', 'id', 'plan', 'taxId'].sort(),
    );
  });

  it('CA-78: GET /customers/999 → 404 NOT_FOUND', async () => {
    const res = await request(createTestApp()).get('/api/customers/999');
    expectBareError(res, 404, 'NOT_FOUND');
  });

  it.each(['abc', '0'])('CA-79: GET /customers/%s → 422 INVALID_FORMAT', async (id) => {
    const res = await request(createTestApp()).get(`/api/customers/${id}`);
    expectValidation(res, [{ field: 'id', issue: 'INVALID_FORMAT' }]);
  });

  it.each(['2147483648', '01', '+1', '1.0', '-1'])(
    'id = %s → 422 INVALID_FORMAT (spec 3.5)',
    async (id) => {
      const res = await request(createTestApp()).get(`/api/customers/${encodeURIComponent(id)}`);
      expectValidation(res, [{ field: 'id', issue: 'INVALID_FORMAT' }]);
    },
  );

  it('id máximo válido e inexistente → 404', async () => {
    const res = await request(createTestApp()).get('/api/customers/2147483647');
    expectBareError(res, 404, 'NOT_FOUND');
  });

  it('?foo=1 → 422 UNKNOWN_FIELD (R-88)', async () => {
    const res = await request(createTestApp()).get('/api/customers/1?foo=1');
    expectValidation(res, [{ field: 'foo', issue: 'UNKNOWN_FIELD' }]);
  });

  it('id inválido y query desconocida se acumulan en orden params → query', async () => {
    const res = await request(createTestApp()).get('/api/customers/abc?foo=1');
    expectValidation(res, [
      { field: 'id', issue: 'INVALID_FORMAT' },
      { field: 'foo', issue: 'UNKNOWN_FIELD' },
    ]);
  });
});

describe('/api/customers/:id: métodos no soportados (RF-10)', () => {
  it('CA-86: DELETE /customers/1 → 405 METHOD_NOT_ALLOWED', async () => {
    const app = createTestApp();
    await postCustomer(app);
    const res = await request(app).delete('/api/customers/1');
    expectBareError(res, 405, 'METHOD_NOT_ALLOWED');
  });

  it.each(['put', 'patch', 'post'] as const)('%s /customers/1 → 405', async (method) => {
    const app = createTestApp();
    await postCustomer(app);
    const res = await request(app)[method]('/api/customers/1').send(customerBody());
    expectBareError(res, 405, 'METHOD_NOT_ALLOWED');
  });
});
