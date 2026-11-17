import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../src/db/connection.ts';
import type { SimulationsRepository } from '../../src/modules/simulations/simulations.repository.ts';
import { createTestApp, createTestDb, silentLogger } from '../helpers/createTestApp.ts';
import {
  createCustomerId,
  postPreview,
  postSimulation,
  simulationBody,
} from '../helpers/simulationFactory.ts';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function countSimulations(db: Db): number {
  return db.prepare<[], number>('SELECT COUNT(*) FROM simulations').pluck().get() ?? 0;
}

describe('POST /api/simulations: guardado (spec 5.8, 6.3)', () => {
  let db: Db;
  let app: Express;
  let customerId: number;

  beforeAll(async () => {
    db = createTestDb();
    app = createTestApp({ db });
    customerId = await createCustomerId(app);
  });

  it('CA-21: POST /simulations válido → 201, id asignado, createdAt en ISO UTC', async () => {
    const res = await postSimulation(app, simulationBody({ customerId }));

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.id).toBeGreaterThan(0);
    expect(res.body.createdAt).toMatch(ISO_UTC);
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
  });

  it('CA-22: preview y guardado con el mismo body → mismos importes, tasa y tiers', async () => {
    const body = simulationBody({ customerId, users: 73 });
    const preview = await postPreview(app, body);
    const saved = await postSimulation(app, body);

    expect(saved.status).toBe(201);
    const { id, createdAt, ...savedPreview } = saved.body;
    expect(id).toEqual(expect.any(Number));
    expect(createdAt).toEqual(expect.any(String));
    expect(savedPreview).toEqual(preview.body);
  });

  it('CA-24: POST /simulations con customerId = 999 → 404 NOT_FOUND', async () => {
    const before = countSimulations(db);
    const res = await postSimulation(app, simulationBody({ customerId: 999 }));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] },
    });
    expect(countSimulations(db)).toBe(before);
  });

  it.each(['put', 'delete'] as const)(
    'CA-25: %s sobre /simulations → 405; sobre /simulations/:id → 404',
    async (method) => {
      const saved = await postSimulation(app, simulationBody({ customerId }));

      const onCollection = await request(app)[method]('/api/simulations');
      expect(onCollection.status).toBe(405);
      expect(onCollection.body.error.code).toBe('METHOD_NOT_ALLOWED');

      const onItem = await request(app)[method](`/api/simulations/${saved.body.id}`);
      expect(onItem.status).toBe(404);
      expect(onItem.body.error.code).toBe('NOT_FOUND');
    },
  );

  it('responde la Simulation exacta de la spec 5.8, sin cabecera Location', async () => {
    const res = await postSimulation(app, simulationBody({ customerId }));

    expect(res.headers.location).toBeUndefined();
    expect(res.body).toEqual({
      id: expect.any(Number),
      customerId,
      users: 15,
      storageGb: 200,
      apiCallsPerMonth: 50000,
      taxRateBp: 2100,
      baseCents: 14000,
      taxCents: 2940,
      totalCents: 16940,
      currency: 'EUR',
      tiers: [
        { from: 1, to: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10000 },
        { from: 11, to: 50, units: 5, unitPriceCents: 800, subtotalCents: 4000 },
      ],
      createdAt: expect.stringMatching(ISO_UTC),
    });
  });

  it('persiste las entradas, el snapshot de la tasa y los tramos (RF-24, RB-09)', async () => {
    const res = await postSimulation(app, simulationBody({ customerId, users: 51 }));
    const row = db
      .prepare<[number], Record<string, unknown>>('SELECT * FROM simulations WHERE id = ?')
      .get(res.body.id);

    expect(row).toMatchObject({
      customer_id: customerId,
      users: 51,
      storage_gb: 200,
      api_calls_per_month: 50000,
      tax_rate_bp: 2100,
      base_cents: res.body.baseCents,
      tax_cents: res.body.taxCents,
      total_cents: res.body.totalCents,
      created_at: res.body.createdAt,
    });
    expect(JSON.parse(String(row?.tiers_json))).toEqual(res.body.tiers);
  });

  it('dos guardados con el mismo body crean dos simulaciones distintas', async () => {
    const body = simulationBody({ customerId });
    const first = await postSimulation(app, body);
    const second = await postSimulation(app, body);

    expect(second.body.id).toBeGreaterThan(first.body.id);
  });
});

describe('POST /api/simulations: recepción, validación y métodos', () => {
  const app = createTestApp();

  it('Content-Type text/plain → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await request(app)
      .post('/api/simulations')
      .set('Content-Type', 'text/plain')
      .send(JSON.stringify(simulationBody()));

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('?foo=1 → 422 UNKNOWN_FIELD', async () => {
    const res = await request(app).post('/api/simulations?foo=1').send(simulationBody());

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ field: 'foo', issue: 'UNKNOWN_FIELD' }]);
  });

  it('body inválido → 422 con los errores acumulados', async () => {
    const res = await postSimulation(app, simulationBody({ users: 0, storageGb: '1' }));

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      { field: 'users', issue: 'OUT_OF_RANGE' },
      { field: 'storageGb', issue: 'INVALID_TYPE' },
    ]);
  });

  it.each(['get', 'patch'] as const)('%s /simulations → 405', async (method) => {
    const res = await request(app)[method]('/api/simulations');

    expect(res.status).toBe(405);
    expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
  });
});

describe('POST /api/simulations: error interno', () => {
  it('CA-89: un error interno simulado → 500 INTERNAL_ERROR sin traza en message', async () => {
    const failure = new Error('disk I/O error at simulations.repository.ts:42');
    const failingRepo: SimulationsRepository = {
      insert: () => {
        throw failure;
      },
    };
    const logger = { ...silentLogger, error: vi.fn() };
    const app = createTestApp({ simulationsRepo: failingRepo, logger });
    const customerId = await createCustomerId(app);

    const res = await postSimulation(app, simulationBody({ customerId }));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: [] },
    });
    expect(JSON.stringify(res.body)).not.toContain('simulations.repository');
    expect(logger.error).toHaveBeenCalledWith('Unhandled error', failure);
  });
});
