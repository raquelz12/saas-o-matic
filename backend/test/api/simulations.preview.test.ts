import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createTestDb } from '../helpers/createTestApp.ts';
import { createCustomerId, postPreview, simulationBody } from '../helpers/simulationFactory.ts';

const T1 = { from: 1, to: 10, unitPriceCents: 1000 };
const T2 = { from: 11, to: 50, unitPriceCents: 800 };
const T3 = { from: 51, to: null, unitPriceCents: 500 };

interface PreviewBody {
  baseCents: number;
  tiers: { subtotalCents: number }[];
}

/** Tramo esperado con `units` y su subtotal (spec 5.2). */
function tier(definition: typeof T1 | typeof T3, units: number) {
  return { ...definition, units, subtotalCents: units * definition.unitPriceCents };
}

describe('POST /api/simulations/preview: tramos (spec 6.1)', () => {
  let app: Express;
  let customerId: number;

  beforeAll(async () => {
    app = createTestApp();
    customerId = await createCustomerId(app);
  });

  it.each([
    ['CA-01', 1, 1000, [tier(T1, 1)]],
    ['CA-02', 10, 10_000, [tier(T1, 10)]],
    ['CA-03', 11, 10_800, [tier(T1, 10), tier(T2, 1)]],
    ['CA-04', 15, 14_000, [tier(T1, 10), tier(T2, 5)]],
    ['CA-05', 50, 42_000, [tier(T1, 10), tier(T2, 40)]],
    ['CA-06', 51, 42_500, [tier(T1, 10), tier(T2, 40), tier(T3, 1)]],
    ['CA-07', 500, 267_000, [tier(T1, 10), tier(T2, 40), tier(T3, 450)]],
    ['CA-08', 1000, 517_000, [tier(T1, 10), tier(T2, 40), tier(T3, 950)]],
  ])('%s: %i usuarios → base %i', async (_ca, users, baseCents, tiers) => {
    const res = await postPreview(app, simulationBody({ customerId, users }));
    expect(res.status).toBe(200);
    expect(res.body.baseCents).toBe(baseCents);
    expect(res.body.tiers).toEqual(tiers);
  });

  it('CA-11: 15 usuarios con distintos storageGb y apiCallsPerMonth → siempre 14 000', async () => {
    for (const [storageGb, apiCallsPerMonth] of [
      [0, 0],
      [100_000, 1_000_000],
      [512, 12_345],
    ]) {
      const res = await postPreview(
        app,
        simulationBody({ customerId, users: 15, storageGb, apiCallsPerMonth }),
      );
      expect(res.body.baseCents).toBe(14_000);
    }
  });

  // Un solo servidor y `fetch`, que reutiliza conexiones keep-alive: supertest abre una
  // por petición y 1000 seguidas agotan los puertos efímeros en Windows (ENOBUFS).
  it('CA-12: Σ tiers[].subtotalCents = baseCents para todo u en 1..1000', async () => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    try {
      for (let users = 1; users <= 1000; users++) {
        const res = await fetch(`http://127.0.0.1:${port}/api/simulations/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(simulationBody({ customerId, users })),
        });
        const preview = (await res.json()) as PreviewBody;
        const sum = preview.tiers.reduce((acc, t) => acc + t.subtotalCents, 0);
        expect(sum, `u = ${users}`).toBe(preview.baseCents);
      }
    } finally {
      server.closeAllConnections();
      server.close();
    }
  }, 60_000);
});

describe('POST /api/simulations/preview: impuesto y total (spec 6.2)', () => {
  it.each([
    ['CA-13', 'ES', 'B12345674', 15, 2100, 14_000, 2940, 16_940],
    ['CA-14', 'DE', 'DE123456789', 15, 1900, 14_000, 2660, 16_660],
    ['CA-15', 'PT', 'PT123456789', 1, 2300, 1000, 230, 1230],
    ['CA-16', 'GB', 'GB123456789', 51, 2000, 42_500, 8500, 51_000],
    ['CA-17', 'IT', 'IT12345678901', 1000, 2200, 517_000, 113_740, 630_740],
  ])(
    '%s: cliente %s, %i usuarios',
    async (_ca, country, taxId, users, taxRateBp, baseCents, taxCents, totalCents) => {
      const app = createTestApp();
      const customerId = await createCustomerId(app, { country, taxId });
      const res = await postPreview(app, simulationBody({ customerId, users }));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ taxRateBp, baseCents, taxCents, totalCents });
    },
  );

  it('CA-18: tasa de ES cambiada a 2105 → taxCents 211, totalCents 1211 (half-up de 210,5)', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    const customerId = await createCustomerId(app);
    db.prepare("UPDATE tax_rates SET rate_bp = 2105 WHERE country_code = 'ES'").run();

    const res = await postPreview(app, simulationBody({ customerId, users: 1 }));
    expect(res.body).toMatchObject({
      taxRateBp: 2105,
      baseCents: 1000,
      taxCents: 211,
      totalCents: 1211,
    });
  });

  it('CA-20: clientes ES STARTER y ENTERPRISE con los mismos usuarios → mismo resultado', async () => {
    const app = createTestApp();
    const starter = await createCustomerId(app, { plan: 'STARTER' });
    const enterprise = await createCustomerId(app, { plan: 'ENTERPRISE', taxId: '12345678Z' });

    const a = await postPreview(app, simulationBody({ customerId: starter, users: 37 }));
    const b = await postPreview(app, simulationBody({ customerId: enterprise, users: 37 }));
    expect(a.status).toBe(200);
    expect({ ...a.body, customerId: undefined }).toEqual({ ...b.body, customerId: undefined });
  });
});

describe('POST /api/simulations/preview: respuesta y errores', () => {
  it('devuelve el SimulationPreview de la spec 5.9, sin id ni createdAt', async () => {
    const app = createTestApp();
    const customerId = await createCustomerId(app);
    const res = await postPreview(app, simulationBody({ customerId }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      customerId,
      users: 15,
      storageGb: 200,
      apiCallsPerMonth: 50000,
      taxRateBp: 2100,
      baseCents: 14000,
      taxCents: 2940,
      totalCents: 16940,
      currency: 'EUR',
      tiers: [tier(T1, 10), tier(T2, 5)],
    });
  });

  it('no persiste nada en simulations (RF-26)', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    const customerId = await createCustomerId(app);
    await postPreview(app, simulationBody({ customerId }));
    expect(db.prepare('SELECT COUNT(*) AS n FROM simulations').get()).toEqual({ n: 0 });
  });

  it('CA-24: preview con customerId = 999 → 404 NOT_FOUND', async () => {
    const res = await postPreview(createTestApp(), simulationBody({ customerId: 999 }));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] },
    });
  });

  it('Content-Type text/plain → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await request(createTestApp())
      .post('/api/simulations/preview')
      .set('Content-Type', 'text/plain')
      .send(JSON.stringify(simulationBody()));
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it.each(['get', 'put', 'patch', 'delete'] as const)(
    '%s /simulations/preview → 405 METHOD_NOT_ALLOWED',
    async (method) => {
      const res = await request(createTestApp())[method]('/api/simulations/preview');
      expect(res.status).toBe(405);
      expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
    },
  );
});
