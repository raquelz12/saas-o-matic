import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createErrorHandler } from '../../http/errorHandler.ts';
import { receiveJson } from '../../http/jsonBody.ts';
import { getValidated, validate } from '../../http/validate.ts';
import { silentLogger } from '../../../test/helpers/createTestApp.ts';
import { buildCreateCustomerSchema } from './customers.schemas.ts';

// Schema de `POST /customers` (spec 3.1, 3.3) pasando por `validate`. Tests
// descriptivos sin CA: los CA del alta van en T-18 (R-85).

const ALL_COUNTRIES = ['DE', 'ES', 'FR', 'GB', 'IT', 'NL', 'PT'];

/** Ejemplo de la spec 5.3. */
const VALID = {
  companyName: '  Peña   Hermanos SA ',
  taxId: 'b-1234 5674',
  email: ' Compras@PenaHermanos.es ',
  country: 'es',
  plan: 'business',
};

type Detail = { field: string; issue: string };

/** App mínima que devuelve el body validado. */
function schemaApp(countries: readonly string[]): Express {
  const app = express();
  app.post(
    '/customers',
    ...receiveJson,
    validate({ body: () => buildCreateCustomerSchema(countries) }),
    (_req, res) => {
      res.json(getValidated(res).body);
    },
  );
  app.use(createErrorHandler(silentLogger));
  return app;
}

function post(body: unknown, countries: readonly string[] = ALL_COUNTRIES) {
  return request(schemaApp(countries)).post('/customers').type('json').send(JSON.stringify(body));
}

async function expectDetails(body: unknown, details: Detail[], countries?: readonly string[]) {
  const res = await post(body, countries);
  expect(res.status).toBe(422);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
  expect(res.body.error.details).toEqual(details);
}

describe('buildCreateCustomerSchema: salida normalizada', () => {
  it('normaliza el ejemplo de la spec 5.3', async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      companyName: 'Peña Hermanos SA',
      taxId: 'B12345674',
      email: 'compras@penahermanos.es',
      country: 'ES',
      plan: 'BUSINESS',
    });
  });

  it('country y plan con trim y mayúsculas: " gb " → GB, " enterprise " → ENTERPRISE', async () => {
    const res = await post({
      ...VALID,
      country: ' gb ',
      plan: ' enterprise ',
      taxId: 'gb-123 456',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ country: 'GB', plan: 'ENTERPRISE', taxId: 'GB123456' });
  });
});

describe('buildCreateCustomerSchema: esquema', () => {
  it.each(['companyName', 'taxId', 'email', 'country', 'plan'])(
    '%s ausente o null → REQUIRED; número → INVALID_TYPE',
    async (field) => {
      const missing: Record<string, unknown> = { ...VALID };
      delete missing[field];
      await expectDetails(missing, [{ field, issue: 'REQUIRED' }]);
      await expectDetails({ ...VALID, [field]: null }, [{ field, issue: 'REQUIRED' }]);
      await expectDetails({ ...VALID, [field]: 42 }, [{ field, issue: 'INVALID_TYPE' }]);
    },
  );

  it('campo desconocido → UNKNOWN_FIELD', async () => {
    await expectDetails({ ...VALID, vip: true }, [{ field: 'vip', issue: 'UNKNOWN_FIELD' }]);
  });

  it('body que no es objeto → body INVALID_TYPE', async () => {
    await expectDetails([VALID], [{ field: 'body', issue: 'INVALID_TYPE' }]);
  });
});

describe('buildCreateCustomerSchema: formato por campo (tabla 3.3)', () => {
  it.each([
    ['companyName', ' A ', 'INVALID_LENGTH'],
    ['companyName', 'x'.repeat(101), 'INVALID_LENGTH'],
    ['companyName', 'Acme​ SA', 'INVALID_FORMAT'],
    ['taxId', 'a-b.1', 'INVALID_LENGTH'],
    ['taxId', '1'.repeat(21), 'INVALID_LENGTH'],
    ['taxId', 'B1234_5674', 'INVALID_FORMAT'],
    ['email', `${'a'.repeat(245)}@example.es`, 'INVALID_LENGTH'],
    ['email', 'compras.penahermanos.es', 'INVALID_FORMAT'],
    ['country', 'US', 'UNSUPPORTED_VALUE'],
    ['country', '', 'UNSUPPORTED_VALUE'],
    ['plan', 'gold', 'UNSUPPORTED_VALUE'],
  ])('%s = %j → %s', async (field, value, issue) => {
    await expectDetails({ ...VALID, [field]: value }, [{ field, issue }]);
  });

  it('la normalización va antes de la longitud: "  A  " recortado tiene 1 code point', async () => {
    await expectDetails({ ...VALID, companyName: '  A  ' }, [
      { field: 'companyName', issue: 'INVALID_LENGTH' },
    ]);
  });

  it('el país se valida contra la lista recibida, no contra una fija', async () => {
    await expectDetails(
      { ...VALID, country: 'gb' },
      [{ field: 'country', issue: 'UNSUPPORTED_VALUE' }],
      ['ES', 'FR'],
    );
  });

  it('acumula un error por cada campo inválido', async () => {
    await expectDetails({ ...VALID, companyName: 'A', email: 'x', plan: 'gold' }, [
      { field: 'companyName', issue: 'INVALID_LENGTH' },
      { field: 'email', issue: 'INVALID_FORMAT' },
      { field: 'plan', issue: 'UNSUPPORTED_VALUE' },
    ]);
  });
});

describe('buildCreateCustomerSchema: identificador español (spec 3.1, paso 5)', () => {
  it.each([
    ['B1234567D', 'INVALID_CHECKSUM'],
    ['B1234567K', 'INVALID_FORMAT'],
    ['es-b1234567-4', 'INVALID_FORMAT'],
    ['1234567L', 'INVALID_FORMAT'],
  ])('ES con %s → taxId %s', async (taxId, issue) => {
    await expectDetails({ ...VALID, taxId }, [{ field: 'taxId', issue }]);
  });

  it('el checksum se ejecuta aunque email falle, y los dos errores se acumulan (orden de zod, R-111)', async () => {
    await expectDetails({ ...VALID, taxId: 'B1234567D', email: 'no-es-un-email' }, [
      { field: 'email', issue: 'INVALID_FORMAT' },
      { field: 'taxId', issue: 'INVALID_CHECKSUM' },
    ]);
  });

  it('el checksum se ejecuta aunque haya claves desconocidas', async () => {
    await expectDetails({ ...VALID, taxId: 'B1234567D', vip: true }, [
      { field: 'vip', issue: 'UNKNOWN_FIELD' },
      { field: 'taxId', issue: 'INVALID_CHECKSUM' },
    ]);
  });

  it('fuera de ES solo aplica la validación genérica', async () => {
    const res = await post({ ...VALID, taxId: 'B1234567D', country: 'fr' });
    expect(res.status).toBe(200);
  });

  it('no se ejecuta si country no es válido', async () => {
    await expectDetails({ ...VALID, taxId: 'B1234567D', country: 'US' }, [
      { field: 'country', issue: 'UNSUPPORTED_VALUE' },
    ]);
    await expectDetails({ ...VALID, taxId: 'B1234567D', country: null }, [
      { field: 'country', issue: 'REQUIRED' },
    ]);
  });

  it('no se ejecuta si taxId falla la validación genérica', async () => {
    await expectDetails({ ...VALID, taxId: 'B12' }, [{ field: 'taxId', issue: 'INVALID_LENGTH' }]);
    await expectDetails({ ...VALID, taxId: 'B1234567Ñ' }, [
      { field: 'taxId', issue: 'INVALID_FORMAT' },
    ]);
  });
});
