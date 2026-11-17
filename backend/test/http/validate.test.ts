import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createErrorHandler } from '../../src/http/errorHandler.ts';
import { receiveJson } from '../../src/http/jsonBody.ts';
import { getValidated, validate } from '../../src/http/validate.ts';
import { translateIssues } from '../../src/http/zodIssues.ts';
import { silentLogger } from '../helpers/createTestApp.ts';

// Middleware `validate` y traductor de issues (spec 3.1 pasos 2–5, 3.2; architecture §5)
// con schemas sintéticos, sin módulos reales y sin CA (plan T-14).

const itemSchema = z.strictObject({
  count: z.int().min(1).max(10),
  name: z.string().min(2).max(5),
  email: z.email(),
  plan: z.enum(['STARTER', 'BUSINESS']),
});

const searchQuery = z.strictObject({ search: z.string().max(100).optional() });

const idParams = z.strictObject({
  id: z.string().refine((v) => /^[1-9][0-9]*$/.test(v), { params: { issue: 'INVALID_FORMAT' } }),
});

const VALID_ITEM = { count: 3, name: 'abc', email: 'a@b.es', plan: 'STARTER' };

/** App mínima que responde con lo que `validate` dejó en `res.locals`. */
function validateApp(factoryCalls: { count: number } = { count: 0 }): Express {
  const app = express();
  const echo: express.RequestHandler = (_req, res) => {
    res.json(getValidated(res));
  };
  const itemFactory = () => {
    factoryCalls.count += 1;
    return itemSchema;
  };
  app.post('/items', ...receiveJson, validate({ body: itemFactory, query: searchQuery }), echo);
  app.get('/search', validate({ query: searchQuery }), echo);
  app.get('/items/:id', validate({ params: idParams }), echo);
  const nested = z.strictObject({ outer: z.strictObject({ inner: z.int() }) });
  const multi = z.strictObject({
    code: z
      .string()
      .min(3)
      .regex(/^[a-z]+$/),
  });
  app.post('/nested', ...receiveJson, validate({ body: nested }), echo);
  app.post('/multi', ...receiveJson, validate({ body: multi }), echo);
  app.use(createErrorHandler(silentLogger));
  return app;
}

function postItems(body: unknown, path = '/items') {
  return request(validateApp()).post(path).send(JSON.stringify(body)).type('json');
}

function expect422(res: request.Response, details: { field: string; issue: string }[]): void {
  expect(res.status).toBe(422);
  expect(res.body).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
  });
}

describe('validate: salida', () => {
  it('un body válido llega a res.locals.validated; las partes sin schema quedan sin valor', async () => {
    const res = await postItems(VALID_ITEM);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body: VALID_ITEM, query: {} });
  });

  it('la salida es la de zod: 10.0 llega como 10 (spec 1.7)', async () => {
    const raw = JSON.stringify(VALID_ITEM).replace('"count":3', '"count":10.0');
    const res = await request(validateApp()).post('/items').type('json').send(raw);
    expect(res.body).toEqual({ body: { ...VALID_ITEM, count: 10 }, query: {} });
  });

  it('la fábrica de schema se evalúa en cada petición', async () => {
    const calls = { count: 0 };
    const app = validateApp(calls);
    await request(app).post('/items').type('json').send(JSON.stringify(VALID_ITEM));
    await request(app).post('/items').type('json').send(JSON.stringify(VALID_ITEM));
    expect(calls.count).toBe(2);
  });
});

describe('validate: traducción de issues', () => {
  // `plan` es un enum: ausente o null, zod da `invalid_value`, no `invalid_type`.
  it.each([
    ['ausentes', {}],
    ['null', { count: null, name: null, email: null, plan: null }],
  ])('campos %s → REQUIRED, también en un enum', async (_name, body) => {
    const fields = ['count', 'name', 'email', 'plan'];
    expect422(
      await postItems(body),
      fields.map((field) => ({ field, issue: 'REQUIRED' })),
    );
  });

  it.each([
    ['tipo JSON incorrecto', 'name', 12, 'INVALID_TYPE'],
    ['cadena numérica en un entero', 'count', '3', 'INVALID_TYPE'],
    ['decimal en un campo entero', 'count', 10.5, 'INVALID_TYPE'],
    ['número por debajo del mínimo', 'count', 0, 'OUT_OF_RANGE'],
    ['número por encima del máximo', 'count', 11, 'OUT_OF_RANGE'],
    ['entero fuera del rango seguro', 'count', 2 ** 60, 'OUT_OF_RANGE'],
    ['string demasiado corto', 'name', 'a', 'INVALID_LENGTH'],
    ['string demasiado largo', 'name', 'abcdef', 'INVALID_LENGTH'],
    ['valor fuera del conjunto', 'plan', 'GOLD', 'UNSUPPORTED_VALUE'],
    ['email no válido según z.email()', 'email', 'no-es-email', 'INVALID_FORMAT'],
  ])('%s (%s) → %s', async (_name, field, value, issue) => {
    expect422(await postItems({ ...VALID_ITEM, [field]: value }), [{ field, issue }]);
  });

  it('claves desconocidas → un UNKNOWN_FIELD por clave', async () => {
    expect422(await postItems({ ...VALID_ITEM, extra: 1, other: 2 }), [
      { field: 'extra', issue: 'UNKNOWN_FIELD' },
      { field: 'other', issue: 'UNKNOWN_FIELD' },
    ]);
  });

  it.each([
    ['null', null],
    ['42', 42],
    ['[]', []],
    ['"texto"', 'texto'],
  ])('un body %s que no es objeto → field "body", INVALID_TYPE', async (_raw, body) => {
    expect422(await postItems(body), [{ field: 'body', issue: 'INVALID_TYPE' }]);
  });

  it('acumula los errores de todos los campos en un solo 422', async () => {
    const body = { count: 0, name: 'a', email: 'x', plan: 'GOLD', extra: true };
    expect422(await postItems(body), [
      { field: 'count', issue: 'OUT_OF_RANGE' },
      { field: 'name', issue: 'INVALID_LENGTH' },
      { field: 'email', issue: 'INVALID_FORMAT' },
      { field: 'plan', issue: 'UNSUPPORTED_VALUE' },
      { field: 'extra', issue: 'UNKNOWN_FIELD' },
    ]);
  });

  it('se queda con el primer issue de cada campo', async () => {
    expect422(await postItems({ code: '1' }, '/multi'), [
      { field: 'code', issue: 'INVALID_LENGTH' },
    ]);
  });

  it('un campo anidado usa la ruta unida por puntos', async () => {
    expect422(await postItems({ outer: { inner: 'x', extra: 1 } }, '/nested'), [
      { field: 'outer.inner', issue: 'INVALID_TYPE' },
      { field: 'outer.extra', issue: 'UNKNOWN_FIELD' },
    ]);
  });
});

describe('validate: query y parámetros de ruta', () => {
  // Con el parser `simple` los valores llegan como string sin convertir (`1.0` sigue siendo `'1.0'`).
  it.each([
    ['query', '/search?search=abc', { query: { search: 'abc' } }],
    ['query sin convertir', '/search?search=1.0', { query: { search: '1.0' } }],
    ['parámetro de ruta', '/items/7', { params: { id: '7' } }],
  ])('un %s válido llega a res.locals.validated', async (_name, url, expected) => {
    const res = await request(validateApp()).get(url);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expected);
  });

  it.each([
    ['parámetro desconocido', '/search?foo=1', 'foo', 'UNKNOWN_FIELD'],
    [
      'parámetro repetido (llega como array)',
      '/search?search=a&search=b',
      'search',
      'INVALID_TYPE',
    ],
    [
      'search[]= (clave literal con el parser simple)',
      '/search?search[]=a',
      'search[]',
      'UNKNOWN_FIELD',
    ],
    ['refine con params.issue del catálogo', '/items/0', 'id', 'INVALID_FORMAT'],
  ])('%s → %s %s', async (_name, url, field, issue) => {
    expect422(await request(validateApp()).get(url), [{ field, issue }]);
  });

  it('acumula errores de query y body; params y query van antes que body', async () => {
    const res = await request(validateApp())
      .post('/items?foo=1')
      .type('json')
      .send(JSON.stringify({ ...VALID_ITEM, count: 0 }));
    expect422(res, [
      { field: 'foo', issue: 'UNKNOWN_FIELD' },
      { field: 'count', issue: 'OUT_OF_RANGE' },
    ]);
  });
});

describe('translateIssues: refines y códigos sin regla propia', () => {
  function translate(schema: z.ZodType, input: unknown) {
    const result = schema.safeParse(input);
    return result.success ? [] : translateIssues(result.error.issues, input, 'body');
  }

  const refineWith = (issue: string) => z.string().refine(() => false, { params: { issue } });

  it('un refine con INVALID_CHECKSUM emite INVALID_CHECKSUM', () => {
    const schema = z.strictObject({ taxId: refineWith('INVALID_CHECKSUM') });
    expect(translate(schema, { taxId: 'X' })).toEqual([
      { field: 'taxId', issue: 'INVALID_CHECKSUM' },
    ]);
  });

  it('un refine sin issue del catálogo → INVALID_FORMAT', () => {
    const schema = z.strictObject({
      a: z.string().refine(() => false),
      b: refineWith('DUPLICATE'),
    });
    expect(translate(schema, { a: 'x', b: 'y' })).toEqual([
      { field: 'a', issue: 'INVALID_FORMAT' },
      { field: 'b', issue: 'INVALID_FORMAT' },
    ]);
  });

  it('un código de zod sin regla propia (not_multiple_of) → INVALID_FORMAT', () => {
    const schema = z.strictObject({ n: z.int().multipleOf(5) });
    expect(translate(schema, { n: 3 })).toEqual([{ field: 'n', issue: 'INVALID_FORMAT' }]);
  });
});
