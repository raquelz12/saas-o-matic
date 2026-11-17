import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';
import { customerBody, postCustomer } from '../helpers/customerFactory.ts';

type Detail = { field: string; issue: string };

/** Contador para generar identificadores distintos. */
let seq = 0;

/**
 * Da de alta un cliente francés por nombre (sin algoritmo de control, RF-06), con
 * identificador `FRX0000n` salvo que se indique otro. Devuelve el `id`.
 */
async function seed(app: Express, companyName: string, taxId?: string): Promise<number> {
  const res = await postCustomer(
    app,
    customerBody({
      companyName,
      country: 'FR',
      taxId: taxId ?? `FRX${String(++seq).padStart(5, '0')}`,
    }),
  );
  expect(res.status).toBe(201);
  return res.body.id;
}

async function seedAll(app: Express, names: string[]): Promise<void> {
  for (const name of names) await seed(app, name);
}

function search(app: Express, query: Record<string, string> = {}) {
  return request(app).get('/api/customers').query(query);
}

function names(res: request.Response): string[] {
  return res.body.items.map((item: { companyName: string }) => item.companyName);
}

function expectValidation(res: request.Response, details: Detail[]) {
  expect(res.status).toBe(422);
  expect(res.body).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
  });
}

/** 25 clientes `Cliente 01`…`Cliente 25`, dados de alta en orden inverso. */
async function twentyFive(): Promise<Express> {
  const app = createTestApp();
  const list = Array.from({ length: 25 }, (_, i) => `Cliente ${String(i + 1).padStart(2, '0')}`);
  await seedAll(app, list.reverse());
  return app;
}

describe('GET /api/customers: búsqueda (RF-11 a RF-13, RB-13)', () => {
  it('CA-69: ?search=PEÑA → "Peña Hermanos SA" y "Comercial Pena"', async () => {
    const app = createTestApp();
    await seedAll(app, ['Peña Hermanos SA', 'Comercial Pena', 'Acme SL']);
    const res = await search(app, { search: 'PEÑA' });
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(['Comercial Pena', 'Peña Hermanos SA']);
  });

  it('CA-70: ?search=logistica → "Logística Norte SL"', async () => {
    const app = createTestApp();
    await seedAll(app, ['Logística Norte SL', 'Acme SL']);
    expect(names(await search(app, { search: 'logistica' }))).toEqual(['Logística Norte SL']);
  });

  it('CA-71: ?search=b-123 → el cliente con identificador B12345674', async () => {
    const app = createTestApp();
    await postCustomer(app, customerBody({ companyName: 'Acme SL' }));
    await seed(app, 'Otra SL');
    const res = await search(app, { search: 'b-123' });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ companyName: 'Acme SL', taxId: 'B12345674' });
  });

  it('nombre e identificador se combinan con OR', async () => {
    const app = createTestApp();
    await seed(app, 'Fr Solutions SL');
    await seed(app, 'Acme SL', 'FR99999');
    await seed(app, 'Otra SL', 'DE12345');
    expect(names(await search(app, { search: 'fr' }))).toEqual(['Acme SL', 'Fr Solutions SL']);
  });

  it('search=- busca solo por nombre: la rama de identificador normaliza a vacío (RF-13)', async () => {
    const app = createTestApp();
    await seedAll(app, ['Hispano-Suiza SL', 'Acme SL']);
    expect(names(await search(app, { search: '-' }))).toEqual(['Hispano-Suiza SL']);
  });

  it('CA-106: ?search=% sin ningún cliente con % → 200, items []', async () => {
    const app = createTestApp();
    await seedAll(app, ['Acme SL', 'Otra SL']);
    const res = await search(app, { search: '%' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it('CA-107: ?search=_ sin ningún cliente con _ → 200, items []', async () => {
    const app = createTestApp();
    await seedAll(app, ['Acme SL', 'Otra SL']);
    const res = await search(app, { search: '_' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it.each([
    ['%', '100% Sabor SL'],
    ['_', 'Data_Lab SL'],
    ['\\', 'Barra\\Invertida SL'],
  ])('%s se busca literalmente y encuentra a quien lo contiene', async (text, name) => {
    const app = createTestApp();
    await seedAll(app, [name, 'Acme SL']);
    expect(names(await search(app, { search: text }))).toEqual([name]);
  });
});

describe('GET /api/customers: listado, orden y paginación (RF-14, RF-15, RF-28)', () => {
  it('CA-72: 25 clientes sin search → items 20, total 25, page 1, ordenados por nombre', async () => {
    const res = await search(await twentyFive());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 25 });
    expect(names(res)).toEqual(
      Array.from({ length: 20 }, (_, i) => `Cliente ${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('CA-73: 25 clientes, ?page=2 → items 5', async () => {
    const res = await search(await twentyFive(), { page: '2' });
    expect(res.body).toMatchObject({ page: 2, pageSize: 20, total: 25 });
    expect(names(res)).toEqual([
      'Cliente 21',
      'Cliente 22',
      'Cliente 23',
      'Cliente 24',
      'Cliente 25',
    ]);
  });

  it('CA-74: 25 clientes, ?page=5 → 200, items [], total 25', async () => {
    const res = await search(await twentyFive(), { page: '5' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 5, pageSize: 20, total: 25 });
  });

  it('search vacío tras el trim devuelve todos (RF-13, RF-14)', async () => {
    const app = createTestApp();
    await seedAll(app, ['Acme SL', 'Otra SL']);
    expect((await search(app, { search: '   ' })).body.total).toBe(2);
  });

  it('total cuenta los que cumplen el filtro, no los de la página', async () => {
    const app = createTestApp();
    await seedAll(app, ['Pena Uno SL', 'Pena Dos SL', 'Pena Tres SL', 'Acme SL']);
    const res = await search(app, { search: 'pena', pageSize: '2' });
    expect(res.body).toMatchObject({ page: 1, pageSize: 2, total: 3 });
    expect(res.body.items).toHaveLength(2);
  });

  it('ordena sin depender de mayúsculas ni acentos, y a igual nombre por id', async () => {
    const app = createTestApp();
    const older = await seed(app, 'Mismo SL');
    await seedAll(app, ['abeto SL', 'Ábaco SL', 'Acme SL']);
    const newer = await seed(app, 'Mismo SL');
    const res = await search(app);
    expect(names(res)).toEqual(['Ábaco SL', 'abeto SL', 'Acme SL', 'Mismo SL', 'Mismo SL']);
    expect(res.body.items.slice(3).map((c: { id: number }) => c.id)).toEqual([older, newer]);
  });

  it('los items son Customer sin company_name_search', async () => {
    const app = createTestApp();
    const created = await postCustomer(app);
    expect((await search(app)).body.items).toEqual([created.body]);
  });
});

describe('GET /api/customers: validación de la query (spec 3.5)', () => {
  it.each([
    [{ pageSize: '101' }, 'pageSize', 'OUT_OF_RANGE'],
    [{ pageSize: '0' }, 'pageSize', 'INVALID_FORMAT'],
    [{ page: '0' }, 'page', 'INVALID_FORMAT'],
    [{ page: 'abc' }, 'page', 'INVALID_FORMAT'],
  ])('CA-75: %j → 422', async (query, field, issue) => {
    expectValidation(await search(createTestApp(), query), [{ field, issue }]);
  });

  it('CA-76: search de 101 caracteres → 422 INVALID_LENGTH', async () => {
    const res = await search(createTestApp(), { search: 'x'.repeat(101) });
    expectValidation(res, [{ field: 'search', issue: 'INVALID_LENGTH' }]);
  });

  it('el máximo se cuenta en code points y tras el trim (R-114)', async () => {
    const app = createTestApp();
    expect((await search(app, { search: '😀'.repeat(100) })).status).toBe(200);
    expect((await search(app, { search: `  ${'x'.repeat(100)}  ` })).status).toBe(200);
  });

  it('CA-77: ?foo=1 → 422 UNKNOWN_FIELD', async () => {
    const res = await search(createTestApp(), { foo: '1' });
    expectValidation(res, [{ field: 'foo', issue: 'UNKNOWN_FIELD' }]);
  });

  it('CA-109: ?search=a&search=b → search INVALID_TYPE; ?search[]=x → search[] UNKNOWN_FIELD', async () => {
    const app = createTestApp();
    const repeated = await request(app).get('/api/customers?search=a&search=b');
    expectValidation(repeated, [{ field: 'search', issue: 'INVALID_TYPE' }]);
    const bracket = await request(app).get('/api/customers?search[]=x');
    expectValidation(bracket, [{ field: 'search[]', issue: 'UNKNOWN_FIELD' }]);
  });

  it('acumula los errores de varios parámetros en un solo 422', async () => {
    const res = await search(createTestApp(), { search: 'x'.repeat(101), page: '0' });
    expectValidation(res, [
      { field: 'search', issue: 'INVALID_LENGTH' },
      { field: 'page', issue: 'INVALID_FORMAT' },
    ]);
  });
});
