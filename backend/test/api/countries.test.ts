import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, createTestDb } from '../helpers/createTestApp.ts';

describe('GET /api/countries', () => {
  it('CA-82: GET /countries → 7 países ordenados por code, con su taxRateBp', async () => {
    const res = await request(createTestApp()).get('/api/countries');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json; charset=utf-8$/i);
    expect(res.body).toEqual({
      items: [
        { code: 'DE', taxRateBp: 1900 },
        { code: 'ES', taxRateBp: 2100 },
        { code: 'FR', taxRateBp: 2000 },
        { code: 'GB', taxRateBp: 2000 },
        { code: 'IT', taxRateBp: 2200 },
        { code: 'NL', taxRateBp: 2100 },
        { code: 'PT', taxRateBp: 2300 },
      ],
    });
  });

  it('lee la tabla de tasas en cada petición, sin caché', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    await request(app).get('/api/countries');
    db.prepare('UPDATE tax_rates SET rate_bp = ? WHERE country_code = ?').run(1500, 'DE');
    const res = await request(app).get('/api/countries');
    expect(res.body.items[0]).toEqual({ code: 'DE', taxRateBp: 1500 });
  });

  it('?foo=1 → 422 UNKNOWN_FIELD', async () => {
    const res = await request(createTestApp()).get('/api/countries?foo=1');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ field: 'foo', issue: 'UNKNOWN_FIELD' }],
      },
    });
  });

  it('POST /countries → 405 METHOD_NOT_ALLOWED', async () => {
    const res = await request(createTestApp()).post('/api/countries').send({});
    expect(res.status).toBe(405);
    expect(res.body.error).toEqual({
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed',
      details: [],
    });
  });
});
