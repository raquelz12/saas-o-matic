import tseslint from 'typescript-eslint';

// Reglas de capas del backend (architecture §2, ADR-007) impuestas con `no-restricted-imports`.
// En flat config, si dos bloques definen la misma regla para un archivo, el último SUSTITUYE al
// anterior (no se suman). Por eso cada capa tiene su propio bloque con globs que no se solapan.
// Los patrones usan `regex` para cubrir imports relativos con o sin extensión `.ts`.

const SRC = 'backend/src';
const FE = 'frontend/src';

// Features del frontend (architecture §1). Una feature nueva hay que añadirla aquí.
const FEATURES = ['customers', 'simulation', 'currency'];
// Superficie pública de `currency` (architecture §3), con o sin extensión.
const CURRENCY_PUBLIC = '(Money|MoneyTotal|useCurrency)(\\.tsx?)?$';
const FETCH_MESSAGE =
  'HTTP solo desde src/api/ o features/currency (CLAUDE.md, architecture §3, R-83).';

/** @param {string} regex @param {string} message */
const deny = (regex, message) => ({ regex, message });

const pkg = (name) => deny(`^${name}(/|$)`, `Esta capa no puede importar '${name}'.`);
const layer = (suffix) =>
  deny(`\\.${suffix}(\\.ts)?$`, `Esta capa no puede importar un ${suffix} (architecture §2).`);
const folder = (name) =>
  deny(`(^|/)${name}(/|$)`, `Esta capa no puede importar '${name}/' (architecture §2).`);

/** @param {string[]} files @param {ReturnType<typeof deny>[]} patterns */
const layerRule = (files, patterns) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/coverage/',
      // Fixtures con imports prohibidos a propósito: solo los lintea backend/test/lint/layers.test.ts.
      'backend/test/lint/fixtures/',
    ],
  },
  tseslint.configs.recommended,

  // Límites globales de CLAUDE.md para los dos workspaces ("~200" y "~40": sin blancos ni comentarios).
  {
    files: ['backend/**/*.{ts,tsx}', 'frontend/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // En los tests, un `describe` supera enseguida 40 líneas; se mantiene `max-lines`.
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off' },
  },

  // Capas del backend (architecture §2).
  layerRule(
    [`${SRC}/modules/*/domain/**/*.ts`],
    [
      pkg('express'),
      pkg('zod'),
      pkg('better-sqlite3'),
      pkg('cors'),
      deny('^\\.\\./', 'domain/ es puro: no puede importar otras capas (architecture §2).'),
    ],
  ),
  layerRule(
    [`${SRC}/modules/**/*.schemas.ts`],
    [pkg('express'), layer('repository'), layer('service')],
  ),
  layerRule(
    [`${SRC}/modules/**/*.repository.ts`],
    [pkg('express'), layer('service'), layer('controller')],
  ),
  layerRule(
    [`${SRC}/modules/**/*.service.ts`],
    [pkg('express'), pkg('better-sqlite3'), pkg('zod'), layer('controller')],
  ),
  layerRule(
    [`${SRC}/modules/**/*.controller.ts`],
    [layer('repository'), folder('db'), folder('domain')],
  ),
  layerRule([`${SRC}/modules/**/*.routes.ts`], [layer('service'), layer('repository')]),
  layerRule([`${SRC}/http/**/*.ts`], [folder('modules')]),

  // Capas del frontend (architecture §3, ADR-007, R-83).
  ...featureRules(),
  layerRule(
    [`${FE}/shared/**/*.{ts,tsx}`],
    [folder('features'), folder('pages'), folder('app'), folder('api')],
  ),
  layerRule([`${FE}/api/**/*.{ts,tsx}`], [folder('features'), folder('pages'), folder('app')]),

  // HTTP solo desde `api/` (backend propio) y `features/currency` (API de tipos de cambio).
  // Los tests quedan fuera porque simulan `fetch`.
  {
    files: [`${FE}/**/*.{ts,tsx}`],
    ignores: [`${FE}/api/**`, `${FE}/features/currency/**`, '**/*.test.{ts,tsx}', `${FE}/test/**`],
    rules: {
      'no-restricted-globals': ['error', { name: 'fetch', message: FETCH_MESSAGE }],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis', 'self'].map((object) => ({
          object,
          property: 'fetch',
          message: FETCH_MESSAGE,
        })),
      ],
    },
  },
);

/**
 * Un bloque por feature: no puede importar otra feature (salvo la superficie pública de
 * `currency`), ni `pages/` ni `app/`. Las features se buscan como segmento `/<nombre>/`, así que
 * la regla no depende de la profundidad del import relativo.
 */
function featureRules() {
  return FEATURES.map((feature) => {
    const others = FEATURES.filter((other) => other !== feature && other !== 'currency');
    const patterns = others.map((other) =>
      deny(`(^|/)${other}/`, `Una feature no puede importar otra ('${other}/', architecture §3).`),
    );
    if (feature !== 'currency') {
      patterns.push(
        deny(
          `(^|/)currency/(?!${CURRENCY_PUBLIC})`,
          'De currency solo se puede importar Money, MoneyTotal o useCurrency (architecture §3).',
        ),
      );
    }
    return layerRule(
      [`${FE}/features/${feature}/**/*.{ts,tsx}`],
      [...patterns, folder('pages'), folder('app')],
    );
  });
}
