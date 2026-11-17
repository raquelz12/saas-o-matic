import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../../src/db/connection.ts';
import { createTestApp, createTestDb } from '../helpers/createTestApp.ts';
import {
  createCustomerId,
  postPreview,
  postSimulation,
  simulationBody,
} from '../helpers/simulationFactory.ts';

/** `GET /api/customers/:id/simulations` con la query indicada. */
function getHistory(app: Express, customerId: number | string, query = '') {
  return request(app).get(`/api/customers/${customerId}/simulations${query}`);
}

/** Guarda una simulación y devuelve el 201 (spec 5.8). */
async function saveSimulation(app: Express, overrides: Record<string, unknown>) {
  const res = await postSimulation(app, simulationBody(overrides));
  if (res.status !== 201) throw new Error(`Simulation setup failed: ${res.status}`);
  return res.body as { id: number };
}

/** 422 con exactamente estos `details`. */
function expectValidation(res: request.Response, details: { field: string; issue: string }[]) {
  expect(res.status).toBe(422);
  expect(res.body).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
  });
}

describe('GET /api/customers/:id/simulations: historial (spec 5.6)', () => {
  let db: Db;
  let app: Express;
  let customerId: number;

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp({ db });
    customerId = await createCustomerId(app);
  });

  it('CA-80: cliente con 3 simulaciones → las 3, de la más reciente a la más antigua', async () => {
    const saved = [];
    for (const users of [5, 15, 60]) saved.push(await saveSimulation(app, { customerId, users }));

    const res = await getHistory(app, customerId);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [...saved].reverse(), page: 1, pageSize: 20, total: 3 });
  });

  it('CA-81: cliente sin simulaciones → 200, items: []', async () => {
    const res = await getHistory(app, customerId);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it('CA-19: la simulación guardada con 2100 conserva tasa e importes tras pasar la tabla a 2200', async () => {
    const before = await saveSimulation(app, { customerId });
    db.prepare("UPDATE tax_rates SET rate_bp = 2200 WHERE country_code = 'ES'").run();

    const after = await saveSimulation(app, { customerId });
    const res = await getHistory(app, customerId);

    expect(res.status).toBe(200);
    // La guardada antes del cambio vuelve idéntica a su 201: misma tasa e importes.
    expect(res.body.items).toEqual([after, before]);
    expect(res.body.items[1].taxRateBp).toBe(2100);
    expect(res.body.items[0].taxRateBp).toBe(2200);
    expect(res.body.items[0].baseCents).toBe(res.body.items[1].baseCents);
    expect(res.body.items[0].taxCents).toBeGreaterThan(res.body.items[1].taxCents);
  });

  it('CA-23: el cliente tiene N simulaciones; un preview no añade ninguna al historial', async () => {
    await saveSimulation(app, { customerId, users: 3 });
    await saveSimulation(app, { customerId, users: 30 });

    const preview = await postPreview(app, simulationBody({ customerId }));
    expect(preview.status).toBe(200);

    const res = await getHistory(app, customerId);
    expect(res.body.total).toBe(2);
    expect(res.body.items).toHaveLength(2);
  });

  it('devuelve los tiers guardados en tiers_json, sin recalcular (RB-09)', async () => {
    const saved = await saveSimulation(app, { customerId, users: 15 });
    const storedTiers = [{ from: 1, to: null, units: 15, unitPriceCents: 1, subtotalCents: 15 }];
    // Snapshot distinto del cálculo actual: copia de la fila con otro tiers_json.
    db.prepare(
      `INSERT INTO simulations (customer_id, users, storage_gb, api_calls_per_month, tax_rate_bp,
         base_cents, tax_cents, total_cents, tiers_json)
       SELECT customer_id, users, storage_gb, api_calls_per_month, tax_rate_bp,
         base_cents, tax_cents, total_cents, ? FROM simulations WHERE id = ?`,
    ).run(JSON.stringify(storedTiers), saved.id);

    const res = await getHistory(app, customerId);
    expect(res.body.items[0].tiers).toEqual(storedTiers);
  });

  it('ordena por createdAt antes que por id', async () => {
    const recent = await saveSimulation(app, { customerId });
    db.prepare(
      `INSERT INTO simulations (customer_id, users, storage_gb, api_calls_per_month, tax_rate_bp,
         base_cents, tax_cents, total_cents, tiers_json, created_at)
       SELECT customer_id, users, storage_gb, api_calls_per_month, tax_rate_bp,
         base_cents, tax_cents, total_cents, tiers_json, '2020-01-01T00:00:00.000Z'
       FROM simulations WHERE id = ?`,
    ).run(recent.id);

    const res = await getHistory(app, customerId);
    const ids = (res.body.items as { id: number }[]).map((item) => item.id);
    expect(ids).toEqual([recent.id, recent.id + 1]);
  });

  it('solo devuelve las simulaciones del cliente pedido', async () => {
    const other = await createCustomerId(app, { taxId: 'X1234567L' });
    await saveSimulation(app, { customerId: other });
    const own = await saveSimulation(app, { customerId });

    const res = await getHistory(app, customerId);
    expect(res.body).toMatchObject({ items: [own], total: 1 });
  });

  it('respeta pageSize y una página más allá del final devuelve items: []', async () => {
    const saved = [];
    for (const users of [1, 2, 3]) saved.push(await saveSimulation(app, { customerId, users }));
    const newestFirst = [...saved].reverse();

    const first = await getHistory(app, customerId, '?pageSize=2');
    expect(first.body).toEqual({ items: newestFirst.slice(0, 2), page: 1, pageSize: 2, total: 3 });

    const second = await getHistory(app, customerId, '?page=2&pageSize=2');
    expect(second.body).toEqual({ items: newestFirst.slice(2), page: 2, pageSize: 2, total: 3 });

    const beyond = await getHistory(app, customerId, '?page=3&pageSize=2');
    expect(beyond.status).toBe(200);
    expect(beyond.body).toEqual({ items: [], page: 3, pageSize: 2, total: 3 });
  });
});

describe('GET /api/customers/:id/simulations: errores (spec 5.6)', () => {
  it('cliente inexistente → 404 NOT_FOUND', async () => {
    const res = await getHistory(createTestApp(), 999);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] },
    });
  });

  it.each(['abc', '0', '2147483648'])('id = %s → 422 INVALID_FORMAT', async (id) => {
    const res = await getHistory(createTestApp(), id);
    expectValidation(res, [{ field: 'id', issue: 'INVALID_FORMAT' }]);
  });

  it('?foo=1 → 422 UNKNOWN_FIELD', async () => {
    const res = await getHistory(createTestApp(), 1, '?foo=1');
    expectValidation(res, [{ field: 'foo', issue: 'UNKNOWN_FIELD' }]);
  });

  it.each([
    ['?pageSize=101', 'pageSize', 'OUT_OF_RANGE'],
    ['?page=0', 'page', 'INVALID_FORMAT'],
  ])('%s → 422', async (query, field, issue) => {
    const res = await getHistory(createTestApp(), 1, query);
    expectValidation(res, [{ field, issue }]);
  });

  it.each(['post', 'put', 'patch', 'delete'] as const)('%s → 405', async (method) => {
    const res = await request(createTestApp())[method]('/api/customers/1/simulations');

    expect(res.status).toBe(405);
    expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
  });
});
