// @vitest-environment node
/// <reference types="node" />
import { join, resolve } from 'node:path';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import { http, imports } from './fixtures.ts';

// Cada fixture se lintea con una ruta virtual dentro de frontend/src para que se le apliquen los
// globs de capa de eslint.config.js (architecture §3, ADR-007, R-83).
const ROOT = resolve(import.meta.dirname, '../../../..');
const CUSTOMERS = 'frontend/src/features/customers/x.ts';
const SIMULATION = 'frontend/src/features/simulation/x.ts';
const CURRENCY = 'frontend/src/features/currency/x.ts';

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: ROOT });
});

async function ruleIds(code: string, virtualPath: string): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, virtualPath) });
  return result?.messages.map((m) => m.ruleId) ?? [];
}

describe('reglas de capas del frontend', () => {
  it.each([
    ['una feature importa otra', imports.otherFeature, CUSTOMERS],
    ['una feature importa otra por features/', imports.otherFeatureDeep, SIMULATION],
    ['currency importa otra feature', imports.otherFeature, CURRENCY],
    ['una feature importa un archivo privado de currency', imports.currencyPrivate, CUSTOMERS],
    ['una feature importa pages/', imports.pages, CUSTOMERS],
    ['una feature importa app/', imports.app, SIMULATION],
    ['api/ importa features/', imports.features, 'frontend/src/api/client.ts'],
    ['shared/ importa features/', imports.features, 'frontend/src/shared/Pagination.tsx'],
    ['shared/ importa api/', imports.apiFromShared, 'frontend/src/shared/Pagination.tsx'],
  ])('falla si %s', async (_label, code, virtualPath) => {
    expect(await ruleIds(code, virtualPath)).toEqual(['no-restricted-imports']);
  });

  it.each([
    ['una feature importa Money de currency', imports.currencyMoney, CUSTOMERS],
    ['una feature importa MoneyTotal de currency', imports.currencyTotal, SIMULATION],
    ['una feature importa useCurrency de currency', imports.currencyHook, CUSTOMERS],
    ['una feature importa un archivo propio', imports.ownFile, CURRENCY],
    ['una feature importa api/', imports.api, CUSTOMERS],
    ['una feature importa shared/', imports.shared, SIMULATION],
    ['una página importa una feature', imports.features, 'frontend/src/pages/Dashboard.tsx'],
  ])('no falla si %s', async (_label, code, virtualPath) => {
    expect(await ruleIds(code, virtualPath)).toEqual([]);
  });
});

describe('fetch solo en api/ y features/currency', () => {
  it.each([
    ['fetch en una feature', http.fetchGlobal, CUSTOMERS, 'no-restricted-globals'],
    [
      'fetch en una página',
      http.fetchGlobal,
      'frontend/src/pages/Dashboard.tsx',
      'no-restricted-globals',
    ],
    ['fetch en shared/', http.fetchGlobal, 'frontend/src/shared/x.ts', 'no-restricted-globals'],
    ['window.fetch en una feature', http.fetchWindow, SIMULATION, 'no-restricted-properties'],
    [
      'globalThis.fetch en app/',
      http.fetchGlobalThis,
      'frontend/src/app/x.ts',
      'no-restricted-properties',
    ],
  ])('falla con %s', async (_label, code, virtualPath, rule) => {
    expect(await ruleIds(code, virtualPath)).toEqual([rule]);
  });

  it.each([
    ['api/', 'frontend/src/api/client.ts'],
    ['features/currency', 'frontend/src/features/currency/fxClient.ts'],
    ['un test', 'frontend/src/features/customers/x.test.ts'],
  ])('no falla en %s', async (_label, virtualPath) => {
    expect(await ruleIds(http.fetchGlobal, virtualPath)).toEqual([]);
    expect(await ruleIds(http.fetchWindow, virtualPath)).toEqual([]);
  });
});
