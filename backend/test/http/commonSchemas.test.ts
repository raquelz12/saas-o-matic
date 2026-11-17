import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  emptyQuerySchema,
  idParamsSchema,
  paginationQuerySchema,
} from '../../src/http/commonSchemas.ts';
import { createErrorHandler } from '../../src/http/errorHandler.ts';
import { getValidated, validate } from '../../src/http/validate.ts';
import { silentLogger } from '../helpers/createTestApp.ts';

// Schemas comunes de `:id`, paginación y query vacía (RF-28, spec 3.5) probados
// a través de `validate`, sin módulos reales y sin CA (plan T-15; CA-75 en T-20, CA-79 en T-19).

const REJECTED = ['0', 'abc', '01', '+1', '1.0'];

/** App mínima que responde con lo que `validate` dejó en `res.locals`. */
function commonApp(): Express {
  const app = express();
  const echo: express.RequestHandler = (_req, res) => {
    res.json(getValidated(res));
  };
  app.get('/items/:id', validate({ params: idParamsSchema, query: emptyQuerySchema }), echo);
  app.get('/list', validate({ query: paginationQuerySchema }), echo);
  app.get('/plain', validate({ query: emptyQuerySchema }), echo);
  app.use(createErrorHandler(silentLogger));
  return app;
}

function get(path: string) {
  return request(commonApp()).get(path);
}

function expect422(res: request.Response, details: { field: string; issue: string }[]): void {
  expect(res.status).toBe(422);
  expect(res.body).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
  });
}

describe('idParamsSchema', () => {
  it.each(['1', '42', '2147483647'])('acepta %s y lo convierte a número', async (id) => {
    const res = await get(`/items/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.params).toEqual({ id: Number(id) });
  });

  it.each(REJECTED)('rechaza %s con INVALID_FORMAT', async (id) => {
    const res = await get(`/items/${encodeURIComponent(id)}`);
    expect422(res, [{ field: 'id', issue: 'INVALID_FORMAT' }]);
  });

  it('2147483648 da INVALID_FORMAT, no OUT_OF_RANGE', async () => {
    const res = await get('/items/2147483648');
    expect422(res, [{ field: 'id', issue: 'INVALID_FORMAT' }]);
  });

  it('un número enorme también da INVALID_FORMAT', async () => {
    const res = await get('/items/99999999999999999999999');
    expect422(res, [{ field: 'id', issue: 'INVALID_FORMAT' }]);
  });
});

describe('paginationQuerySchema: valores', () => {
  it('sin query, los valores por defecto son 1 y 20', async () => {
    const res = await get('/list');
    expect(res.status).toBe(200);
    expect(res.body.query).toEqual({ page: 1, pageSize: 20 });
  });

  it('convierte page y pageSize a número', async () => {
    const res = await get('/list?page=3&pageSize=50');
    expect(res.body.query).toEqual({ page: 3, pageSize: 50 });
  });

  it('acepta los máximos: page 2147483647 y pageSize 100', async () => {
    const res = await get('/list?page=2147483647&pageSize=100');
    expect(res.status).toBe(200);
    expect(res.body.query).toEqual({ page: 2147483647, pageSize: 100 });
  });

  it('cada campo ausente toma su valor por defecto', async () => {
    expect((await get('/list?page=2')).body.query).toEqual({ page: 2, pageSize: 20 });
    expect((await get('/list?pageSize=5')).body.query).toEqual({ page: 1, pageSize: 5 });
  });
});

describe('paginationQuerySchema: rechazos', () => {
  it.each(REJECTED)('page %s da INVALID_FORMAT', async (page) => {
    const res = await get(`/list?page=${encodeURIComponent(page)}`);
    expect422(res, [{ field: 'page', issue: 'INVALID_FORMAT' }]);
  });

  it.each(REJECTED)('pageSize %s da INVALID_FORMAT', async (pageSize) => {
    const res = await get(`/list?pageSize=${encodeURIComponent(pageSize)}`);
    expect422(res, [{ field: 'pageSize', issue: 'INVALID_FORMAT' }]);
  });

  it('page vacío da INVALID_FORMAT', async () => {
    expect422(await get('/list?page='), [{ field: 'page', issue: 'INVALID_FORMAT' }]);
  });

  it('pageSize 101 da OUT_OF_RANGE', async () => {
    expect422(await get('/list?pageSize=101'), [{ field: 'pageSize', issue: 'OUT_OF_RANGE' }]);
  });

  it('page 2147483648 da OUT_OF_RANGE', async () => {
    expect422(await get('/list?page=2147483648'), [{ field: 'page', issue: 'OUT_OF_RANGE' }]);
  });

  it('un page repetido da INVALID_TYPE', async () => {
    expect422(await get('/list?page=1&page=2'), [{ field: 'page', issue: 'INVALID_TYPE' }]);
  });

  it('acumula los errores de page, pageSize y las claves desconocidas', async () => {
    const res = await get('/list?page=0&pageSize=101&foo=1');
    expect422(res, [
      { field: 'page', issue: 'INVALID_FORMAT' },
      { field: 'pageSize', issue: 'OUT_OF_RANGE' },
      { field: 'foo', issue: 'UNKNOWN_FIELD' },
    ]);
  });
});

describe('emptyQuerySchema', () => {
  it('acepta una query vacía', async () => {
    const res = await get('/plain');
    expect(res.status).toBe(200);
    expect(res.body.query).toEqual({});
  });

  it('?foo=1 da UNKNOWN_FIELD', async () => {
    expect422(await get('/plain?foo=1'), [{ field: 'foo', issue: 'UNKNOWN_FIELD' }]);
  });

  it('una clave desconocida en la ruta de :id da UNKNOWN_FIELD tras los errores de params', async () => {
    const res = await get('/items/0?foo=1');
    expect422(res, [
      { field: 'id', issue: 'INVALID_FORMAT' },
      { field: 'foo', issue: 'UNKNOWN_FIELD' },
    ]);
  });
});
