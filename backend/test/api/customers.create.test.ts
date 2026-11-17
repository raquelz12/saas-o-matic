import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, createTestDb } from '../helpers/createTestApp.ts';
import { customerBody, customerBodyWithout, postCustomer } from '../helpers/customerFactory.ts';

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

describe('POST /api/customers: alta y normalización', () => {
  it('CA-38: el body de ejemplo de 5.3 → 201 normalizado', async () => {
    const res = await postCustomer(
      createTestApp(),
      customerBody({
        companyName: '  Peña   Hermanos SA ',
        taxId: 'b-1234 5674',
        email: ' Compras@PenaHermanos.es ',
        country: 'es',
        plan: 'business',
      }),
    );
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/^application\/json; charset=utf-8$/i);
    expect(res.body).toEqual({
      id: 1,
      companyName: 'Peña Hermanos SA',
      taxId: 'B12345674',
      email: 'compras@penahermanos.es',
      country: 'ES',
      plan: 'BUSINESS',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
  });

  it('201 con Location: /api/customers/{id}', async () => {
    const app = createTestApp();
    await postCustomer(app);
    const res = await postCustomer(app, customerBody({ taxId: 'A87654323' }));
    expect(res.status).toBe(201);
    expect(res.headers['location']).toBe('/api/customers/2');
    expect(res.body.id).toBe(2);
  });

  it('guarda company_name_search sin exponerlo en la respuesta', async () => {
    const db = createTestDb();
    const res = await postCustomer(
      createTestApp({ db }),
      customerBody({ companyName: '  Peña   Hermanos SA ' }),
    );
    expect(res.body).not.toHaveProperty('companyNameSearch');
    const row = db
      .prepare('SELECT company_name_search FROM customers WHERE id = ?')
      .get(res.body.id);
    expect(row).toEqual({ company_name_search: 'pena hermanos sa' });
  });

  it('CA-39: companyName = "A" → 422 INVALID_LENGTH', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ companyName: 'A' }));
    expectValidation(res, [{ field: 'companyName', issue: 'INVALID_LENGTH' }]);
  });

  it('CA-40: companyName de 101 code points → 422 INVALID_LENGTH', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ companyName: 'ñ'.repeat(101) }));
    expectValidation(res, [{ field: 'companyName', issue: 'INVALID_LENGTH' }]);
  });

  it('CA-41: companyName con U+0007 → 422 INVALID_FORMAT', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ companyName: 'Acme\u0007 SL' }));
    expectValidation(res, [{ field: 'companyName', issue: 'INVALID_FORMAT' }]);
  });

  it('CA-42: companyName = "<b>Acme</b>" → 201, guardado tal cual', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ companyName: '<b>Acme</b>' }));
    expect(res.status).toBe(201);
    expect(res.body.companyName).toBe('<b>Acme</b>');
  });

  it('CA-43: companyName = "Müller & Söhne GmbH" → 201', async () => {
    const name = 'Müller & Söhne GmbH';
    const res = await postCustomer(createTestApp(), customerBody({ companyName: name }));
    expect(res.status).toBe(201);
    expect(res.body.companyName).toBe(name);
  });

  it('CA-44: email = "no-es-un-email" → 422 INVALID_FORMAT', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ email: 'no-es-un-email' }));
    expectValidation(res, [{ field: 'email', issue: 'INVALID_FORMAT' }]);
  });

  it('CA-45: email de 255 caracteres → 422 INVALID_LENGTH', async () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(186)}.com`;
    expect(email).toHaveLength(255);
    const res = await postCustomer(createTestApp(), customerBody({ email }));
    expectValidation(res, [{ field: 'email', issue: 'INVALID_LENGTH' }]);
  });

  it('CA-46: country = "US" → 422 UNSUPPORTED_VALUE', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ country: 'US' }));
    expectValidation(res, [{ field: 'country', issue: 'UNSUPPORTED_VALUE' }]);
  });

  it('CA-47: country = " gb " → 201, guardado como GB', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ country: ' gb ' }));
    expect(res.status).toBe(201);
    expect(res.body.country).toBe('GB');
  });

  it('CA-48: plan = "PREMIUM" → 422 UNSUPPORTED_VALUE', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ plan: 'PREMIUM' }));
    expectValidation(res, [{ field: 'plan', issue: 'UNSUPPORTED_VALUE' }]);
  });

  it.each(['companyName', 'taxId', 'email', 'country', 'plan'])(
    'CA-49: falta %s → 422 REQUIRED',
    async (field) => {
      const res = await postCustomer(createTestApp(), customerBodyWithout(field));
      expectValidation(res, [{ field, issue: 'REQUIRED' }]);
    },
  );

  it('lee los países de tax_rates en cada petición', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    db.prepare('INSERT INTO tax_rates (country_code, rate_bp) VALUES (?, ?)').run('US', 0);
    const res = await postCustomer(app, customerBody({ country: 'us' }));
    expect(res.status).toBe(201);
    expect(res.body.country).toBe('US');
  });
});

describe('POST /api/customers: recepción, query y métodos', () => {
  it('CA-83: el body es {invalido → 400 MALFORMED_JSON con details: []', async () => {
    const res = await request(createTestApp())
      .post('/api/customers')
      .set('Content-Type', 'application/json')
      .send('{invalido');
    expectBareError(res, 400, 'MALFORMED_JSON');
  });

  it('CA-84: body vacío → 400 MALFORMED_JSON', async () => {
    const res = await request(createTestApp())
      .post('/api/customers')
      .set('Content-Type', 'application/json');
    expectBareError(res, 400, 'MALFORMED_JSON');
  });

  it('CA-85: Content-Type: text/plain → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await request(createTestApp())
      .post('/api/customers')
      .set('Content-Type', 'text/plain')
      .send(JSON.stringify(customerBody()));
    expectBareError(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('body de más de 10 kB → 413 PAYLOAD_TOO_LARGE', async () => {
    const res = await postCustomer(
      createTestApp(),
      customerBody({ companyName: 'x'.repeat(11_000) }),
    );
    expectBareError(res, 413, 'PAYLOAD_TOO_LARGE');
  });

  it('?foo=1 → 422 UNKNOWN_FIELD', async () => {
    const res = await request(createTestApp()).post('/api/customers?foo=1').send(customerBody());
    expectValidation(res, [{ field: 'foo', issue: 'UNKNOWN_FIELD' }]);
  });

  it('PUT /customers → 405 METHOD_NOT_ALLOWED', async () => {
    const res = await request(createTestApp()).put('/api/customers').send(customerBody());
    expectBareError(res, 405, 'METHOD_NOT_ALLOWED');
  });

  it('body que no es un objeto → 422 field body INVALID_TYPE', async () => {
    const res = await postCustomer(createTestApp(), []);
    expectValidation(res, [{ field: 'body', issue: 'INVALID_TYPE' }]);
  });

  it('campo desconocido → 422 UNKNOWN_FIELD', async () => {
    const res = await postCustomer(createTestApp(), customerBody({ vip: true }));
    expectValidation(res, [{ field: 'vip', issue: 'UNKNOWN_FIELD' }]);
  });
});
