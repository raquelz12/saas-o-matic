import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createErrorHandler } from '../../src/http/errorHandler.ts';
import { receiveJson } from '../../src/http/jsonBody.ts';
import { methodNotAllowed } from '../../src/http/methodNotAllowed.ts';
import { notFound } from '../../src/http/notFound.ts';
import { silentLogger } from '../helpers/createTestApp.ts';

// Pipeline de recepción (spec 3.1 paso 1 y 5.1) sobre un router de prueba, sin CA:
// los CA-83 a CA-86 van en las rutas reales (T-18, T-19; R-86).

const LIMIT_BYTES = 10 * 1024;

/** App mínima: GET y POST en `/items`, el resto de métodos → 405. */
function receptionApp(): Express {
  const app = express();
  const router = express.Router();
  router
    .route('/items')
    .get((_req, res) => {
      res.json({ ok: true });
    })
    .post(...receiveJson, (req, res) => {
      res.status(201).json({ received: req.body as unknown });
    })
    .all(methodNotAllowed);
  router.get('/fails', () => {
    throw Object.assign(new Error('stream encoding should not be set'), {
      type: 'stream.encoding.set',
    });
  });
  app.use('/api', router);
  app.use(notFound);
  app.use(createErrorHandler(silentLogger));
  return app;
}

function postItems(contentType = 'application/json') {
  return request(receptionApp()).post('/api/items').set('Content-Type', contentType);
}

/** Body JSON de exactamente `bytes` bytes. */
function jsonOfSize(bytes: number): string {
  const overhead = '{"pad":""}'.length;
  return JSON.stringify({ pad: 'x'.repeat(bytes - overhead) });
}

function expectError(res: request.Response, status: number, code: string): void {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ error: { code, message: expect.any(String), details: [] } });
}

describe('recepción: JSON (400)', () => {
  it('un JSON válido llega al handler', async () => {
    const res = await postItems().send('{"users":10}');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: { users: 10 } });
  });

  it('JSON inválido → 400 MALFORMED_JSON con details []', async () => {
    expectError(await postItems().send('{invalido'), 400, 'MALFORMED_JSON');
  });

  it('body vacío → 400 MALFORMED_JSON (body-parser lo convertiría en {})', async () => {
    expectError(await postItems().send(''), 400, 'MALFORMED_JSON');
  });

  it('POST sin body → 400 MALFORMED_JSON', async () => {
    expectError(await postItems(), 400, 'MALFORMED_JSON');
  });

  it('body con solo espacios → 400 MALFORMED_JSON', async () => {
    expectError(await postItems().send('  \n '), 400, 'MALFORMED_JSON');
  });

  it.each([
    ['null', null],
    ['42', 42],
    ['[]', []],
    ['"texto"', 'texto'],
  ])('con strict: false, %s llega al handler para que lo rechace el schema', async (raw, value) => {
    const res = await postItems().send(raw);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: value });
  });
});

describe('recepción: Content-Type (415)', () => {
  it.each([
    'application/json; charset=UTF-8',
    'application/json;charset=utf-8',
    'APPLICATION/JSON',
    'Application/Json; Charset="utf-8"',
  ])('acepta %j', async (contentType) => {
    expect((await postItems(contentType).send('{}')).status).toBe(201);
  });

  it.each([
    'text/plain',
    'application/x-www-form-urlencoded',
    'application/vnd.api+json',
    'application/json; charset=latin1',
    'application/json; version=2',
  ])('%j → 415 UNSUPPORTED_MEDIA_TYPE', async (contentType) => {
    expectError(await postItems(contentType).send('{}'), 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('sin Content-Type → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    expectError(await request(receptionApp()).post('/api/items'), 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('el 415 se comprueba antes que el 400', async () => {
    expectError(await postItems('text/plain').send('{invalido'), 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('el 415 se comprueba antes que el 413', async () => {
    const res = await postItems('text/plain').send(jsonOfSize(LIMIT_BYTES + 1));
    expectError(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('un GET no exige Content-Type', async () => {
    const res = await request(receptionApp()).get('/api/items').set('Content-Type', 'text/plain');
    expect(res.status).toBe(200);
  });
});

describe('recepción: tamaño (413)', () => {
  it('un body de exactamente 10 kB se acepta', async () => {
    expect((await postItems().send(jsonOfSize(LIMIT_BYTES))).status).toBe(201);
  });

  it('un body de más de 10 kB → 413 PAYLOAD_TOO_LARGE', async () => {
    expectError(await postItems().send(jsonOfSize(LIMIT_BYTES + 1)), 413, 'PAYLOAD_TOO_LARGE');
  });
});

describe('recepción: método (405) y ruta (404)', () => {
  it.each(['delete', 'put', 'patch'] as const)(
    '%s sobre una ruta existente → 405 METHOD_NOT_ALLOWED',
    async (method) => {
      expectError(await request(receptionApp())[method]('/api/items'), 405, 'METHOD_NOT_ALLOWED');
    },
  );

  it('un POST a una ruta inexistente → 404, no 415', async () => {
    const res = await request(receptionApp()).post('/api/otra').set('Content-Type', 'text/plain');
    expectError(res, 404, 'NOT_FOUND');
  });

  it('otro error de body-parser no previsto sigue siendo 500 INTERNAL_ERROR', async () => {
    expectError(await request(receptionApp()).get('/api/fails'), 500, 'INTERNAL_ERROR');
  });
});
