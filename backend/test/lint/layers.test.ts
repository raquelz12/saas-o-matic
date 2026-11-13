import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

// Cada fixture se lintea con una ruta virtual dentro de backend/src (o frontend/src) para que
// se le apliquen los globs de capa de eslint.config.js. Los fixtures reales están ignorados.
const ROOT = resolve(import.meta.dirname, '../../..');
const FIXTURES = join(import.meta.dirname, 'fixtures');
const MODULE = 'backend/src/modules/customers';

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: ROOT });
});

async function ruleIds(code: string, virtualPath: string): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, virtualPath) });
  return result?.messages.map((m) => m.ruleId) ?? [];
}

const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');

describe('reglas de capas del backend', () => {
  it.each([
    ['domain/ importa express', 'domain-express.ts', `${MODULE}/domain/taxId.ts`],
    ['domain/ importa zod', 'domain-zod.ts', `${MODULE}/domain/taxId.ts`],
    ['domain/ importa otra capa', 'domain-other-layer.ts', `${MODULE}/domain/taxId.ts`],
    [
      'un controller importa un repository',
      'controller-repository.ts',
      `${MODULE}/customers.controller.ts`,
    ],
    ['http/ importa modules/*', 'http-modules.ts', 'backend/src/http/validate.ts'],
  ])('falla si %s', async (_label, name, virtualPath) => {
    expect(await ruleIds(fixture(name), virtualPath)).toEqual(['no-restricted-imports']);
  });

  it.each([
    ['domain/ importa un archivo hermano', 'domain-sibling.ts', `${MODULE}/domain/quote.ts`],
    [
      'un controller importa su service',
      'controller-service.ts',
      `${MODULE}/customers.controller.ts`,
    ],
  ])('no falla si %s', async (_label, name, virtualPath) => {
    expect(await ruleIds(fixture(name), virtualPath)).toEqual([]);
  });
});

describe('límites globales en los dos workspaces', () => {
  const longFile = Array.from({ length: 201 }, (_, i) => `export const v${i} = ${i};`).join('\n');
  const body = Array.from({ length: 40 }, (_, i) => `  const v${i} = ${i};`).join('\n');
  const sum = Array.from({ length: 40 }, (_, i) => `v${i}`).join(' + ');
  const longFunction = `export function f(): number {\n${body}\n  return ${sum};\n}\n`;

  it.each(['backend/src/shared/long.ts', 'frontend/src/shared/long.ts'])(
    'max-lines salta con 201 líneas en %s',
    async (virtualPath) => {
      expect(await ruleIds(longFile, virtualPath)).toEqual(['max-lines']);
    },
  );

  it.each(['backend/src/shared/long.ts', 'frontend/src/shared/long.tsx'])(
    'max-lines-per-function salta con una función de más de 40 líneas en %s',
    async (virtualPath) => {
      expect(await ruleIds(longFunction, virtualPath)).toEqual(['max-lines-per-function']);
    },
  );

  it('max-lines-per-function no se aplica a los tests', async () => {
    expect(await ruleIds(longFunction, 'backend/src/shared/long.test.ts')).toEqual([]);
  });

  it.each(['backend/src/shared/parse.ts', 'frontend/src/shared/parse.ts'])(
    'no-explicit-any salta en %s',
    async (virtualPath) => {
      expect(await ruleIds(fixture('explicit-any.ts'), virtualPath)).toEqual([
        '@typescript-eslint/no-explicit-any',
      ]);
    },
  );
});
