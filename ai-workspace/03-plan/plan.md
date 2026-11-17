# SaaS-O-Matic — Plan de implementación (v.25)

## Changelog
- v.01 — Propuesta inicial a partir de esquema-inicial.md.
- v.02 — Aplicada la revisión del plan (05-review-log.md, fase 3): R-79 a R-94.
- v.03 — Node 24 LTS en lugar de 22 (05-review-log.md, fase 4): R-95.
- v.04 — Decisiones tomadas al implementar T-02 (05-review-log.md, R-96): `App.tsx` añadido a sus archivos; dependencias implícitas (@types/react, @types/react-dom, @testing-library/dom); jsdom fijado en 29.x; opcionales de Testing Library no instaladas.
- v.05 — Decisiones tomadas al implementar T-03 (05-review-log.md, R-97): `backend/tsconfig.json` añadido a sus archivos (excluir fixtures y tipos de Node); @types/node instalado; `max-lines-per-function` desactivada en los tests; límites sin contar líneas en blanco ni comentarios.
- v.06 — Decisiones tomadas al implementar T-04 (05-review-log.md, R-98): `package-lock.json` añadido a sus archivos (regenerado con npm 11.21 porque al de npm 11.6 le faltaban dependencias opcionales y `npm ci` fallaba en CI); npm local actualizado a la misma versión que el CI.
- v.07 — Decisiones tomadas al implementar T-05 (05-review-log.md, R-99): función `calculateBase(users)` con tipos `Tier` y `BaseBreakdown`; tramos como constante interna; CA-12 contrastado además con la fórmula de RB-01; fallo local de Vitest con rutas `/c/` de Git Bash documentado.
- v.08 — Decisiones tomadas al implementar T-06 (05-review-log.md, R-100): `calculateQuote` en `quote.ts` propio con su `quote.test.ts`; tipo `Quote` sin `taxRateBp`; filas de RB-07 en el test de `money` nombradas `RB-07: …`.
- v.09 — Decisiones tomadas al implementar T-07 (05-review-log.md, R-101): tipo `TaxIdResult`; tabla de letras e iniciales como constantes internas; iniciales de CIF dan `INVALID_FORMAT` hasta T-08; filas de 3.6.7 y 3.6.8 sin CA nombradas `3.6.7: …` y `3.6.8: …`.
- v.10 — Decisiones tomadas al implementar T-08 (05-review-log.md, R-102): CIF en `taxId.ts`, sin `cif.ts`; orden formato → forma exigida → valor; las 17 iniciales probadas; filas sin CA nombradas `3.6.7: …` y `3.6.8: …`.
- v.11 — Decisiones tomadas al implementar T-09 (05-review-log.md, R-103): API de cada normalizador y validador; si fallan longitud y formato, gana la longitud; se normaliza antes de validar (un tabulador se colapsa); U+FEFF se trata como espacio; marcas combinantes con `\p{M}`; `toUpperCase` antes de comprobar el identificador.
- v.12 — Decisiones tomadas al implementar T-10a y T-10b (05-review-log.md, R-104): versiones exactas de las dependencias (supertest 7.3.1, no 7.3.2); `backend/package.json` (script `dev` con `--env-file-if-exists`) y `package-lock.json` añadidos a sus archivos; test unitario del `errorHandler` en `backend/src/http/errorHandler.test.ts`; `DB_PATH` por defecto `./data/saas-o-matic.db`; mensajes `Resource not found` e `Internal server error`; CORS con `origin` como array.
- v.13 — Decisiones tomadas al implementar T-11 (05-review-log.md, R-105): better-sqlite3 13.0.3 y @types/better-sqlite3 9.6.0; `createTestDb()` aparte de `createTestApp()`; tabla `schema_migrations`; orden numérico y número duplicado como error; una transacción por migración; `db:migrate` falla si no existe `backend/migrations/`; script `db:migrate` también en el `package.json` raíz.
- v.14 — Decisiones tomadas al implementar T-12 (05-review-log.md, R-106): `prepareDatabase()` para el arranque y `createTestDb()`; `seedTaxRates` con `INSERT OR IGNORE`; `db:seed` no migra; `migrate.test.ts` con BD vacía; tests de esquema en dos archivos y un módulo de filas; script `db:seed` también en la raíz.
- v.15 — Decisiones tomadas al implementar T-13 (05-review-log.md, R-107): `receiveJson` montado por ruta; `Content-Type` analizado a mano, solo con `charset=utf-8`; body vacío detectado con `verify`; 405 sin `Allow`; subclases de `AppError` en `shared/errors.ts`; punto «body vacío» de architecture verificado.
- v.16 — Decisiones tomadas al implementar T-14 (05-review-log.md, R-108): `REQUIRED` decidido por el valor de entrada, no por el código de zod; un issue por campo; códigos sin regla → `INVALID_FORMAT`; `details` en orden `params` → `query` → `body`; salida en `res.locals.validated` con `getValidated`; `ValidationError` en `shared/errors.ts`; tres puntos de zod 4 y Express 5 de architecture verificados.
- v.17 — Decisiones tomadas al implementar T-15 (05-review-log.md, R-109): `INVALID_FORMAT` para `page`/`pageSize` sin formato y `OUT_OF_RANGE` por encima del máximo; constantes de paginación en `shared/pagination.ts`; exports de `commonSchemas.ts`, con `paginationQueryFields` para T-20.
- v.18 — Decisiones tomadas al implementar T-16 (05-review-log.md, R-110): `AppDeps` recibe `db`; `server.ts` y `createTestApp.ts` añadidos a sus archivos (`createTestApp` usa `createTestDb()` por defecto); módulo `countries` con fábricas; `getRateBp` devuelve `undefined` con un código inexistente; test sin caché de `tax_rates`.
- v.19 — Decisiones tomadas al implementar T-17 (05-review-log.md, R-111): `details` en el orden en que zod emite los issues, con el checksum al final (distinto del ejemplo de 5.3); checksum como `superRefine` del objeto con `when`; `country` con refine en vez de `z.enum`; exports `buildCreateCustomerSchema`, `PLANS` y `CreateCustomerInput`.
- v.20 — Decisiones tomadas al implementar T-18 (05-review-log.md, R-112): `DuplicateError` en `shared/errors.ts` (añadido a sus archivos); el service calcula `company_name_search` con `searchKey`; el repositorio traduce `SQLITE_CONSTRAINT_UNIQUE` sin SELECT previo; los países llegan a la ruta como función desde `app.ts`; `plan: string` en la entidad; `GET /customers` da 405 hasta T-20.
- v.21 — Decisiones tomadas al implementar T-19 (05-review-log.md, R-113): `findById` devuelve `undefined` y el `NotFoundError` lo lanza el service; 404 con el mensaje genérico `Resource not found`; `/:id` valida `params` y `query` y da 405 al resto de métodos, incluido `POST`.
- v.22 — Decisiones tomadas al implementar T-20 (05-review-log.md, R-114): `search` medido en code points tras el trim; claves de RB-13 calculadas en el service y rama de identificador omitida si normaliza a vacío; escapado de LIKE y `@taxId` nulo en el repositorio; `total` con `COUNT(*)` aparte.
- v.23 — Decisiones tomadas al implementar T-21 (05-review-log.md, R-115): tasa inexistente → 500; `runInTransaction` inyectado desde `app.ts`; `quote` interna reutilizable por T-22; máximo de `customerId` como constante local; tests en dos archivos con el helper `simulationFactory.ts` (añadidos a sus archivos); CA-12 con un único servidor y `fetch`.
- v.24 — Decisiones tomadas al implementar T-22 (05-review-log.md, R-116): `AppDeps.simulationsRepo` opcional para CA-89; `save` reutiliza `quote` en la misma transacción que el `insert`; el service reexporta el tipo `Simulation` para el controller; `postSimulation` añadido a `simulationFactory.ts` (añadido a sus archivos).
- v.25 — Decisiones tomadas al implementar T-23 (05-review-log.md, R-117): `AppDeps.simulationsRepo` pasa a `Partial<SimulationsRepository>`, combinado con el repositorio real en `app.ts`; anotación del sustituto de CA-89 en `simulations.create.test.ts` (añadido a sus archivos); `history` con `findById` y `listByCustomer` en una sola transacción; router propio `createCustomerSimulationsRouter` montado bajo `/api/customers`; tests sin CA de orden por `createdAt` y de `tiers` sin recalcular con SQL directo.

## Contexto

Ya están cerradas la spec (v1.1), la arquitectura y los ADR 001–007. Este plan desarrolla tu esquema ([esquema-inicial.md](esquema-inicial.md)) en tareas T-XX que se pueden integrar en main una a una. Mantiene tus hitos y su orden (M0 → M5). Donde un punto del esquema pasaba de 4 h o de unos 8 archivos, lo he dividido sin cambiar el orden. Lo que creo que convendría reordenar o añadir va aparte, en la sección **Observaciones**.

Incluye los cambios R-79 a R-94 del review log (fase 3).

Reglas comunes a todas las tareas:
- **Definición de terminado:** `npm run lint`, `npm run typecheck` y `npm test` en verde.
- **Estimación:** la de cada tarea va entre corchetes.
- **Tests:** se nombran con su CA (`CA-XX: …`). Cada CA tiene un solo test de API (o de componente, en el frontend). Un CA puede aparecer además en un test de dominio o de lógica pura, como permite architecture §6. Los tests de schemas y middlewares son unitarios y descriptivos, sin CA.
- **Dominio con TDD:** en las tareas `domain/` (y en T-26), primero se escriben los tests y se espera tu OK (CLAUDE.md). Ese OK es un punto de control dentro de la rama de la tarea: a main solo llega la tarea con los tests y la implementación en verde (R-90).
- **Dependencias:** solo las de la tabla siguiente, y cada una requiere tu aprobación antes de instalarla.

### Dependencias por tarea (pendientes de aprobación, R-92)

| Tarea | Dependencias | Nota |
|---|---|---|
| T-01 | typescript, vitest, eslint, typescript-eslint, prettier | Stack de CLAUDE.md |
| T-01 | tsx | **Fuera del stack.** Alternativa: type stripping nativo de Node 24 (sin flag). **Decidido en T-01: type stripping nativo; no se instala tsx** |
| T-02 | react, react-dom, vite, @vitejs/plugin-react, @testing-library/react, jsdom, concurrently | Stack y spec 4.7. jsdom lo necesita Testing Library en Vitest. **Decidido en T-02: jsdom 29.x**, porque la 30 y la 31 exigen Node ≥ 24.15 y `engines` admite cualquier 24.x |
| T-02 | @types/react, @types/react-dom, @testing-library/dom | **Añadidas en T-02.** Implícitas: los tipos para el typecheck y @testing-library/dom como dependencia de pares obligatoria de @testing-library/react |
| T-02 | @testing-library/user-event, @testing-library/jest-dom | **Opcionales. Decidido en T-02: no se instalan**; se usan `fireEvent` y las aserciones de Vitest. Se pueden reconsiderar en M4 |
| T-03 | @types/node (24.x) en el backend | **Añadida en T-03.** Implícita: el test de lint usa `node:fs`, `node:path` e `import.meta.dirname`, y TypeScript 6 exige declararla en `types`. También la necesitarán T-10a y T-10b |
| T-10b | express@5, cors, zod@4, supertest y sus @types | Stack. **Instaladas en T-10a y T-10b (R-104), con versión exacta:** zod 4.6.7 (T-10a), express 5.3.0, cors 2.8.6, supertest 7.3.1, @types/express 5.0.6, @types/cors 2.8.19 y @types/supertest 7.2.1. supertest 7.3.1 y no 7.3.2, que solo tenía 8 días. Sin `dotenv`: Node 24 lee el `.env` con `--env-file-if-exists` |
| T-11 | better-sqlite3 y @types/better-sqlite3 | Stack. **Instaladas en T-11 (R-105), con versión exacta:** better-sqlite3 13.0.3 y @types/better-sqlite3 9.6.0 (etiqueta `ts6.0`). La 13.1.1 y la 13.2.0 tenían menos de dos semanas. Trae binarios precompilados (`prebuilds/`, incluido `linux-x64`), así que no compila nada al instalarse |
| T-24a | react-router, @tanstack/react-query | Stack |
| T-26 | big.js y @types/big.js | Spec RF-42 |
| T-27 | zod@4 en el frontend | Spec RF-41 |

---

## M0 · Estructura

### T-01 · Monorepo raíz y workspace backend [3 h]
- **Objetivo:** dejar el monorepo con npm workspaces, TypeScript estricto, Prettier, ESLint base y Vitest funcionando en el backend.
- **Referencias:** RNF-01, spec 4.7 (puertos y scripts), ADR-001.
- **Depende de:** —
- **Archivos:** `package.json` (workspaces, `engines`, scripts `lint`, `typecheck`, `test`), `.nvmrc`, `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`), `.prettierrc`, `eslint.config.js` (base), `.gitignore`, `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/test/smoke.test.ts`. Son 10 archivos, una excepción aceptada porque casi todos son configuración de pocas líneas (R-84).
- **Criterios:** `npm ci && npm run lint && npm run typecheck && npm test` pasa desde la raíz con Node 24; `engines.node` es `24.x`; queda decidido cómo se ejecuta TS en dev (`tsx` o type stripping nativo).
- **Tests:** un smoke test trivial en el backend.
- **Fuera de alcance:** frontend, reglas de capas, CI y cualquier código de la aplicación.

### T-02 · Workspace frontend [2 h]
- **Objetivo:** añadir el workspace `frontend/` con Vite, React, Vitest y Testing Library, y un `npm run dev` que arranque los dos workspaces.
- **Referencias:** RNF-01, spec 4.7 (`concurrently`, puerto 5173).
- **Depende de:** T-01.
- **Archivos:** `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/main.tsx` (mínimo), `frontend/src/App.tsx` (añadido en T-02: el test no puede importar `main.tsx`, que monta la aplicación al cargarse), `frontend/src/test/setup.ts`, `frontend/src/App.test.tsx` (smoke), y el script `dev` en el `package.json` raíz (con `--if-present` para el backend, que aún no tiene `dev`).
- **Criterios:** `npm run dev` levanta Vite en 5173 (el backend todavía es un placeholder); lint, typecheck y test en verde en los dos workspaces.
- **Tests:** un smoke test de render con Testing Library.
- **Fuera de alcance:** router, TanStack Query, estilos, reglas de capas del frontend y `.env.example` del frontend.

### T-03 · Reglas de capas del backend y límites globales en ESLint [2–3 h]
- **Objetivo:** imponer la tabla de capas de architecture §2 con `no-restricted-imports` por glob, y los límites globales de CLAUDE.md.
- **Referencias:** ADR-007, architecture §2, reglas de código de CLAUDE.md.
- **Depende de:** T-01, T-02.
- **Archivos:** `eslint.config.js`, fixtures con imports prohibidos en `backend/test/lint/fixtures/` (excluidos del lint normal) y `backend/test/lint/layers.test.ts`. **Añadido en T-03:** `backend/tsconfig.json`, para excluir los fixtures del typecheck (importan paquetes que aún no están instalados) y declarar `"types": ["node"]`.
- **Decisiones de T-03:**
  - `max-lines` y `max-lines-per-function` no cuentan líneas en blanco ni comentarios, porque CLAUDE.md dice «~200» y «~40».
  - `max-lines-per-function` se desactiva en `*.test.{ts,tsx}`. `max-lines` sigue aplicándose.
  - Un bloque de ESLint por capa con globs que no se solapan: en flat config, la misma regla en dos bloques se sustituye, no se suma.
  - El test lintea cada fixture con `lintText` y una ruta virtual dentro de `backend/src` o `frontend/src`.
- **Criterios:**
  - `domain/` que importa `express` o `zod` falla.
  - Un controller que importa un repository falla.
  - `http/` que importa `modules/*` falla.
  - Reglas globales para los dos workspaces: `max-lines` 200, `max-lines-per-function` 40 y `no-explicit-any`.
- **Tests:** un test que ejecuta la API de ESLint sobre los fixtures y comprueba qué reglas saltan.
- **Fuera de alcance:** las reglas de `pages`, `features` y `api/` del frontend, que van en T-24a (R-83), y la CI.

### T-04 · GitHub Actions [1 h]
- **Objetivo:** ejecutar lint, typecheck y test en cada PR y en cada push a main.
- **Referencias:** CLAUDE.md (Stack general).
- **Depende de:** T-03.
- **Archivos:** `.github/workflows/ci.yml`. **Añadido en T-04:** `package-lock.json`.
- **Decisiones de T-04:**
  - Se ejecuta en todo PR y en cada push a `main`, con un solo job: `npm ci`, `lint`, `typecheck` y `test`. Permisos `contents: read` y `concurrency` para cancelar ejecuciones antiguas de la misma rama.
  - `actions/checkout@v6` y `actions/setup-node@v6`, fijadas por versión mayor.
  - El lockfile generado con npm 11.6 no incluía `@emnapi/core` ni `@emnapi/runtime` (opcionales de `@rolldown/binding-wasm32-wasi`, vía Vite). El npm 11.21 que trae la última Node 24 en CI lo detecta y `npm ci` falla. Se regenera con npm 11.21 sin cambiar ninguna versión.
  - Para evitar que se repita, el lockfile se genera con un npm igual o más reciente que el de CI (npm 11 actualizado en local).
- **Criterios:** el workflow usa `node-version-file: .nvmrc` y `npm ci`, y un PR de prueba sale en verde.
- **Tests:** el propio CI.
- **Fuera de alcance:** better-sqlite3 (se comprueba en T-11, R-89), el script de cobertura de CA (T-36) y cualquier despliegue.

---

## M1 · Dominio (TDD: primero los tests, espero tu OK y luego implemento)

### T-05 · Tramos de precio (`pricing`) [2 h]
- **Objetivo:** función pura que, dados los usuarios, devuelve la base y los tramos (`Tier[]`, solo los que tienen `units > 0`).
- **Referencias:** RF-21, RB-01, RB-02, RB-03, spec 5.2 (`Tier`).
- **Depende de:** T-01.
- **Archivos:** `backend/src/modules/simulations/domain/pricing.ts` y `pricing.test.ts`.
- **Criterios:** CA-01 a CA-08 a nivel de unidad; CA-12 como propiedad para todo `u` en 1..1000.
- **Tests:** un test por fila de RB-03, más la propiedad Σ subtotales = base.
- **Decisiones de T-05:**
  - API: `calculateBase(users): BaseBreakdown`, con `BaseBreakdown = { baseCents, tiers }` y `Tier` tal como lo define la spec 5.2 (`to: null` en el tramo 3). T-06 la usará desde `calculateQuote`.
  - Los tramos (RB-02) son una constante interna `TIERS`, sin exportar. Se exportará si alguna tarea posterior la necesita.
  - `baseCents` se obtiene sumando los subtotales. Para que CA-12 no se cumpla por construcción, el test compara además, para todo `u` de 1 a 1000, `baseCents` con la fórmula de RB-01 escrita aparte en el test, y comprueba que Σ `units` = `u` y que ningún tramo tiene `units = 0`.
  - No valida la entrada: el rango 1..1000 y que sea entero los garantiza el schema (CA-09 y CA-10 van en T-21).
  - La fila u = 100 de RB-03 no tiene CA; su test se nombra `RB-03: …`.
  - Los imports relativos llevan la extensión `.ts` (type stripping nativo, `allowImportingTsExtensions`).
  - **Problema del entorno local:** desde Git Bash, `npm test` lanzado en la ruta POSIX `/c/Users/...` hace fallar todas las suites con «Vitest failed to find the runner». Ocurre también en main sin cambios. Con `C:/Users/...` o desde PowerShell pasan. No afecta al CI (Linux) y no se ha cambiado ninguna configuración.
- **Fuera de alcance:** impuesto, validación de rangos (es del schema) y persistencia.

### T-06 · Impuesto half-up y `calculateQuote` [2 h]
- **Objetivo:** `taxCents(base, rateBp)` en aritmética entera y `calculateQuote(users, rateBp)`, que devuelve base, impuesto, total y tramos.
- **Referencias:** RF-22, RB-05, RB-07, RB-08, ADR-006.
- **Depende de:** T-05.
- **Archivos:** `backend/src/modules/simulations/domain/money.ts` y `money.test.ts`, y `calculateQuote` (en `pricing.ts` o en un `quote.ts` propio, dentro del límite de tamaño). **Decidido en T-06:** `quote.ts` y `quote.test.ts`.
- **Criterios:** los valores de CA-13 a CA-17 y CA-18 (2105 bp → 211) a nivel de unidad; `total = base + impuesto` siempre.
- **Tests:** la tabla RB-07, el caso RB-08 y casos límite de half-up (x,5 sube; x,4999 baja).
- **Decisiones de T-06 (R-100):**
  - `taxCents(baseCents, rateBp)` en `money.ts` con `floor((base × bp + 5000) / 10000)` (ADR-006). No depende de los tramos.
  - `calculateQuote(users, rateBp): Quote` en `quote.ts`, que combina `calculateBase` y `taxCents`. Así `pricing.ts` queda solo con los tramos.
  - `Quote = { baseCents, taxCents, totalCents, tiers }`, sin `taxRateBp`: la tasa la lee el service (RB-06) y ya la tiene para el snapshot.
  - Las filas de RB-07 se prueban en `money.test.ts` como `RB-07: …`; los CA-13 a CA-18 van en `quote.test.ts`.
  - La propiedad `total = base + impuesto` se comprueba para todo `u` de 1 a 1000 y seis tasas, contra un half-up escrito aparte en el test (cociente y resto) para que no se cumpla por construcción.
  - No valida la entrada: los rangos los garantizan el schema y el `CHECK (tax_rate_bp BETWEEN 0 AND 10000)`.
- **Fuera de alcance:** lectura de tasas y transacciones.

### T-07 · Identificador fiscal español: detección, DNI, NIE y NIF especial [3 h]
- **Objetivo:** `validateSpanishTaxId(normalizado)`, que devuelve `OK`, `INVALID_FORMAT` o `INVALID_CHECKSUM`, con detección por posiciones (sin regex) para DNI, NIE y K/L/M.
- **Referencias:** RF-05, spec 3.6.1–3.6.5 y 3.6.8.
- **Depende de:** T-01.
- **Archivos:** `backend/src/modules/customers/domain/taxId.ts` y `taxId.test.ts`.
- **Criterios:** filas de la tabla 3.6.7 de DNI, NIE y K/L/M; CA-50, CA-52, CA-53, CA-54, CA-60, CA-61 y CA-62 (longitud ≠ 9) a nivel de unidad; `00000000T` y `X0000000T` válidos; `12345678U` y `123456789` dan `INVALID_FORMAT`. CA-51 no está aquí: es un caso de normalización y va en T-09 (R-87).
- **Tests:** tabla parametrizada con los casos de 3.6.7 que aplican.
- **Decisiones de T-07 (R-101):**
  - API: `validateSpanishTaxId(normalized): TaxIdResult`, con `TaxIdResult = 'OK' | 'INVALID_FORMAT' | 'INVALID_CHECKSUM'`. Nunca lanza.
  - La tabla de 23 letras (3.6.2) y los conjuntos de iniciales (`XYZ`, `KLM`) son constantes internas, sin exportar.
  - Detección por posiciones: longitud 9, primer carácter, posiciones centrales dígito a dígito y control. Un control fuera de la tabla de 23 letras da `INVALID_FORMAT`; uno de la tabla que no coincide, `INVALID_CHECKSUM`.
  - Hasta T-08, las iniciales de CIF dan `INVALID_FORMAT` como cualquier otra letra, sin test que fije ese comportamiento provisional.
  - No valida la entrada: el valor llega ya normalizado (T-09).
  - Las filas de 3.6.7 y 3.6.8 sin CA se nombran `3.6.7: …` y `3.6.8: …`; los casos límite añadidos (posición central no numérica en cada tipo, `L` y `M`, control fuera de tabla en NIF especial, iniciales `T` y `O`, 10 caracteres) son descriptivos y sin CA.
- **Fuera de alcance:** CIF (T-08) y normalización (T-09).

### T-08 · Identificador fiscal español: CIF [2 h]
- **Objetivo:** añadir el algoritmo del CIF y la forma de control que exige cada letra inicial.
- **Referencias:** RF-05, spec 3.6.6.
- **Depende de:** T-07.
- **Archivos:** `taxId.ts` (o `cif.ts` si se supera el límite de tamaño) y sus tests. **Decidido en T-08:** `taxId.ts` y `taxId.test.ts`, sin `cif.ts`.
- **Criterios:** CA-55 a CA-59 a nivel de unidad; `B1234567K` da `INVALID_FORMAT`; `A87654323` es válido.
- **Tests:** las filas CIF de 3.6.7 y un caso de cada grupo de letras (solo letra, solo dígito, ambos).
- **Decisiones de T-08 (R-102):**
  - El CIF va en `taxId.ts`, que queda en 91 líneas. Si T-09 lo acerca al límite de 200, se separará entonces.
  - `checkCif(initial, digits, control)` y `cifControlValue(digits)` (pasos 1–4 de 3.6.6) son funciones internas. `JABCDEFGHI` y los tres grupos de iniciales (`PQRSNW`, `ABEH`, `CDFGJUV`) son constantes internas, sin exportar.
  - Orden de comprobación: posiciones centrales no numéricas o control fuera de `0–9` y `JABCDEFGHI` → `INVALID_FORMAT`; control con una forma que la inicial no admite → `INVALID_CHECKSUM`; control distinto de D → `INVALID_CHECKSUM`.
  - En lugar de un caso por grupo, se prueban las 17 iniciales, cada una con la forma admitida y la no admitida (con `1234567`, D = 4). Se añade además D = 0 → `J` (`P0000000J`).
  - Las filas `A87654323` y `B1234567K` se nombran `3.6.7: …`, y la provincia `00` (`B00000000`), `3.6.8: …`. El resto de casos límite (control que no coincide como dígito y como letra, posición central no numérica) son descriptivos y sin CA.
  - Desaparece el comportamiento provisional de T-07: las iniciales de CIF ya no dan `INVALID_FORMAT` por defecto.
- **Fuera de alcance:** el cruce con `country` (es del schema, T-17).

### T-09 · Normalizadores y clave de búsqueda [3 h]
- **Objetivo:** funciones puras de normalización y validación genérica para el nombre de empresa, el identificador, el email y la clave de búsqueda.
- **Referencias:** RF-02, RF-03 (solo trim, minúsculas y longitud; el formato lo valida `z.email()` en T-17), RF-04, RF-06, RF-12, RF-13, RB-13, spec 1.7.
- **Depende de:** T-01.
- **Archivos:** en `backend/src/modules/customers/domain/`: `companyName.ts`, `searchKey.ts`, ampliación de `taxId.ts` (`normalizeTaxId`, `validateGenericTaxId`), `email.ts`, cada uno con su test.
- **Criterios:**
  - Nombre: NFC, `\s` Unicode (incluidos NBSP y U+2009) colapsado a U+0020, longitud 2–100 en code points, `\p{Cc}`, `\p{Cf}` y `\p{Cs}` → `INVALID_FORMAT`.
  - Clave de búsqueda: `searchKey("Peña")` = `searchKey("PENA")` = `"pena"`.
  - Limitación conocida: `Łódź` no se descompone (spec 1.7).
  - CA-39, CA-40, CA-41, CA-43, CA-45, CA-51, CA-64, CA-65, CA-69 y CA-70 a nivel de unidad.
- **Tests:** casos por función, incluidos NBSP, U+200B, U+202E y emoji con ZWJ.
- **Decisiones de T-09 (R-103):**
  - API (en cada caso, `raw` es el valor recibido y `normalized` el que devuelve su normalizador):
    - `normalizeCompanyName(raw)` y `validateCompanyName(normalized): CompanyNameResult` (`'OK' | 'INVALID_LENGTH' | 'INVALID_FORMAT'`).
    - `searchKey(raw)`.
    - `normalizeTaxId(raw)` y `validateGenericTaxId(normalized): GenericTaxIdResult` (`'OK' | 'INVALID_LENGTH' | 'INVALID_FORMAT'`), en `taxId.ts`.
    - `normalizeEmail(raw)` y `validateEmailLength(normalized): EmailLengthResult` (`'OK' | 'INVALID_LENGTH'`).
    - Ninguna lanza excepciones.
  - **Si fallan longitud y formato, gana la longitud** (`"\u0007"` → `INVALID_LENGTH`; `AB_` → `INVALID_LENGTH`). Sigue el orden de la tabla 3.3 y el del email (254 antes de `z.email()`).
  - Se normaliza antes de validar (3.1): un tabulador o un salto de línea son `\s` y se colapsan, así que no dan `INVALID_FORMAT`. U+0085, que es `Cc` y no es `\s` en JS, sí lo da.
  - `\s` es el de JS con el flag `u`. Incluye U+FEFF, que se trata como espacio aunque sea `Cf`. U+200B no es `\s` y da `INVALID_FORMAT`.
  - El emoji con ZWJ da `INVALID_FORMAT` (U+200D es `Cf`), como asume RF-02.
  - `searchKey` usa `normalizeCompanyName`, `toLowerCase`, NFD y quita las marcas combinantes con `\p{M}`. No valida, y la usan tanto la columna `company_name_search` como el texto buscado.
  - `normalizeTaxId` hace `toUpperCase` antes de comprobar el formato (RF-04 al pie de la letra): `ß` pasa a `SS` y queda como alfanumérico. La regla `A–Z0–9` es ASCII.
  - Longitudes en code points (`[...s].length`). Los CA de 6.5 y 6.6 sin columna de unidad (CA-42, CA-63) no se prueban aquí (R-87).
  - `taxId.ts` queda en 114 líneas. `taxId.test.ts` tiene 213 líneas en total, pero cumple `max-lines` porque no cuenta las líneas en blanco (R-97).
- **Fuera de alcance:** zod, el escapado de LIKE (va en el repositorio, T-20) y country y plan (trim y mayúsculas triviales, en el schema).

---

## M2 · Base del backend

### T-10a · Config, logger y `.env.example` [2 h]
- **Objetivo:** configuración validada con zod y valores por defecto, logger centralizado y `.env.example` del backend.
- **Referencias:** RNF-02, RNF-03, architecture §1 (`config/`, `shared/`).
- **Depende de:** T-03.
- **Archivos:** `backend/src/config/env.ts`, `backend/src/config/env.test.ts`, `backend/src/shared/logger.ts` y `backend/.env.example`. **Añadidos en T-10a:** `backend/package.json` y `package-lock.json`, por la instalación de zod.
- **Dependencias:** zod@4 (se instala aquí, aunque la tabla lo asocia a T-10b).
- **Criterios:**
  - Sin variables, la config usa `PORT` 3000, `HOST` `127.0.0.1` y `CORS_ORIGIN` `http://localhost:5173`.
  - Un `PORT` no numérico o un `CORS_ORIGIN` que no es URL lanza un error con el nombre de la variable.
  - `.env.example` tiene `PORT`, `HOST`, `DB_PATH` y `CORS_ORIGIN`.
- **Tests:** unitarios del schema de config.
- **Fuera de alcance:** Express, errores HTTP y BD.
- **Decisiones de T-10a (R-104):**
  - `loadConfig(env = process.env): Config`, con `Config = { port, host, dbPath, corsOrigin }`. Si falla, lanza un único `Error` que nombra todas las variables no válidas.
  - `PORT`: solo dígitos y entre 1 y 65535 (`abc`, `3000.5`, `-1`, `""`, `0` y `65536` se rechazan).
  - `HOST` y `DB_PATH`: string no vacío. **`DB_PATH` por defecto `./data/saas-o-matic.db`**, relativo a `backend/` y cubierto por `*.db` en `.gitignore`.
  - `CORS_ORIGIN`: `z.url()` con protocolo `http` o `https`. Se guarda tal cual, sin normalizarlo a origen.
  - `logger` con `info`, `warn` y `error` sobre `console`, y una interfaz `Logger` para sustituirlo en los tests.

### T-10b · `createApp`, `server`, CORS, errores y 404 [3 h]
- **Objetivo:** esqueleto ejecutable del backend: jerarquía `AppError`, `errorHandler` central con el formato 5.1, CORS, 404 de respaldo, `createApp(deps)` y `server.ts`.
- **Referencias:** RF-30, RF-31, spec 5.1 (CORS y formato de error), ADR-002, architecture §5.
- **Depende de:** T-10a.
- **Archivos:** `backend/src/shared/errors.ts`, `backend/src/http/errorHandler.ts`, `backend/src/http/notFound.ts`, `backend/src/app.ts`, `backend/src/server.ts`, `backend/test/helpers/createTestApp.ts` (versión inicial) y `backend/test/api/app.test.ts`. **Añadidos en T-10b:** `backend/src/http/errorHandler.test.ts` (el test unitario que pide la ficha), y `backend/package.json` y `package-lock.json` (dependencias y script `dev`).
- **Criterios:**
  - CA-87: `GET /api/inexistente` → 404 `NOT_FOUND`.
  - CA-88: formato `{ error: { code, message, details } }`.
  - Un `Error` desconocido → 500 `INTERNAL_ERROR` con mensaje genérico y la traza solo en el logger (test unitario sin CA; CA-89 va en T-22).
  - `OPTIONS` de preflight → 204.
  - Una petición con `Origin` igual a `CORS_ORIGIN` recibe `Access-Control-Allow-Origin`; otro origen no (R-91).
- **Tests:** API (Supertest) sobre CA-87, CA-88, el preflight y CORS; test unitario del `errorHandler`.
- **Fuera de alcance:** BD, body JSON, 415/413/400, 405, validación y `shared/pagination.ts` (pasa a T-15).
- **Decisiones de T-10b (R-104):**
  - `AppError { status, code, message, details }` y `NotFoundError`. El resto de subclases llegan con su tarea.
  - Mensajes: `Resource not found` (404) e `Internal server error` (500), en inglés como el `Request validation failed` de la spec 5.1.
  - `createErrorHandler(logger)`: un `AppError` se serializa tal cual; cualquier otro valor lanzado (también uno que no es `Error`) da 500 y va a `logger.error`. Si las cabeceras ya se enviaron, delega en Express.
  - `createApp({ config, logger })`, con `config: Pick<Config, 'corsOrigin'>`. Orden: `cors` → rutas → `notFound` → `errorHandler`.
  - **CORS con `origin: [corsOrigin]`:** con un string, `cors` envía `Access-Control-Allow-Origin` a cualquier origen y no se cumpliría el criterio de R-91.
  - `createTestApp(overrides?)` usa `loadConfig({})` y un `silentLogger`.
  - Script `dev` del backend: `node --watch --env-file-if-exists=.env src/server.ts`, sin `dotenv`. `npm run dev` arranca ya los dos workspaces.

### T-11 · Conexión SQLite y runner de migraciones [2–3 h]
- **Objetivo:** conexión con `PRAGMA foreign_keys = ON` y runner de migraciones numeradas e idempotentes, con el script `db:migrate`.
- **Referencias:** spec 4.1 y 4.7, ADR-003.
- **Depende de:** T-10b, T-04.
- **Archivos:** `backend/src/db/connection.ts`, `backend/src/db/migrate.ts`, migraciones de prueba en `backend/test/db/fixtures/` (nunca en `backend/migrations/`), `backend/test/db/migrate.test.ts`, el script `db:migrate` y `createTestApp` (`:memory:`). **Añadidos en T-11:** `package.json` raíz (script `db:migrate`, el que cita CLAUDE.md), `backend/package.json` y `package-lock.json` (dependencias y script). **Cambiado en T-11:** la BD de prueba la da `createTestDb()`, en `backend/test/helpers/createTestApp.ts`, y no `createTestApp`.
- **Criterios:**
  - Ejecutar el runner dos veces no hace nada la segunda.
  - Las migraciones se aplican en orden numérico y se registran como aplicadas.
  - `foreign_keys` vale 1 en cada conexión.
  - CI en verde con better-sqlite3 instalado en Node 24 (R-89, R-95).
- **Tests:** `backend/test/db/migrate.test.ts` con las migraciones de prueba.
- **Fuera de alcance:** el esquema real, el seed de tasas y la migración al arrancar (T-12, R-79).
- **Decisiones de T-11 (R-105):**
  - `openDatabase(path): Db` ejecuta `PRAGMA foreign_keys = ON` en cada conexión. Si la ruta no es `:memory:`, crea la carpeta del archivo, porque `./data/` no existe y sin ella better-sqlite3 no puede abrir la BD. No añade PRAGMAs que la spec no pide (por ejemplo, WAL).
  - `runMigrations(db, dir = MIGRATIONS_DIR): string[]` devuelve las migraciones aplicadas en esa llamada. Registra cada una en `schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT …) STRICT`, con la fecha en ISO 8601 UTC como el resto de tablas (spec 4.1).
  - Solo cuentan los archivos `NNN_nombre.sql`, ordenados por el valor numérico del prefijo (`10_` va después de `2_`). Los demás archivos se ignoran. Dos archivos con el mismo número (`001_` y `1_`) lanzan un error antes de aplicar nada.
  - Cada migración y su registro van en una transacción. Si falla, no deja cambios a medias y las anteriores quedan aplicadas. Por eso las migraciones no deben llevar `BEGIN` ni `COMMIT` propios.
  - Si la carpeta no existe, lanza `Migrations directory not found`. Hasta T-12, que crea `backend/migrations/001_init.sql`, `npm run db:migrate` termina con ese error.
  - Ejecución por comando con `if (import.meta.main)` en `migrate.ts` (Node ≥ 24.2): config → conexión → migrar → log → cierre. Scripts `db:migrate` en el backend (`node --env-file-if-exists=.env src/db/migrate.ts`) y en la raíz (`npm run db:migrate -w backend`).
  - **`createTestDb()` aparte:** abre una BD `:memory:` nueva en cada llamada. `createTestApp()` no cambia, y `createApp` todavía no recibe `db`: lo hará cuando haya repositorios. T-12 hará que `createTestDb()` migre y siembre las tasas.
  - Migraciones de prueba en `fixtures/ordered/` (`1_`, `2_` y `10_`, más un `README.txt` que se ignora), `fixtures/failing/` y `fixtures/duplicate/`. El caso de solo aplicar las nuevas usa una carpeta temporal.

### T-12 · Esquema `001_init.sql`, seed de tasas y migración al arrancar [3–4 h]
- **Objetivo:** crear las tablas `STRICT`, los `CHECK`, `UNIQUE`, índices y triggers de inmutabilidad de la spec; añadir el seed `INSERT OR IGNORE` de `tax_rates` con `db:seed`, y hacer que el servidor migre y siembre las tasas al arrancar.
- **Referencias:** RF-10, RF-25, RF-32, RF-33, spec 4.3–4.5 y 4.7, R-71.
- **Depende de:** T-11.
- **Archivos:** `backend/migrations/001_init.sql`, `backend/src/db/seedTaxRates.ts`, `server.ts`, el script `db:seed`, `createTestDb` (migrar y sembrar; R-105), `backend/test/db/schema.test.ts` y `backend/test/db/seed.test.ts`. **Añadidos en T-12 (R-106):** `backend/src/db/prepareDatabase.ts`, `backend/test/db/schema.customers.test.ts`, `backend/test/db/schemaRows.ts`, `backend/test/db/migrate.test.ts` (BD vacía), `backend/package.json` y `package.json` raíz (script `db:seed`).
- **Criterios:**
  - CA-26: `UPDATE` o `DELETE` sobre `simulations` aborta.
  - CA-27: el `CHECK` de `total_cents` rechaza el `INSERT`.
  - Triggers de `customers`, FK hacia `tax_rates` y `UNIQUE(country_code, tax_id)`.
  - El seed carga las 7 tasas y no revierte una tasa editada a mano.
  - Arrancar sobre una BD vacía deja migraciones y tasas aplicadas sin pasos manuales (R-71; no tiene CA).
- **Tests:** better-sqlite3 directo, sin pasar por la API.
- **Fuera de alcance:** repositorios y seed demo.
- **Decisiones de T-12 (R-106):**
  - `001_init.sql` copia la spec 4.3–4.5 al pie de la letra, sin restricciones extra (por ejemplo, no comprueba que `tiers_json` sea un array). Nombres: `customers_search_idx`, `simulations_history_idx`, `customers_no_update`, `customers_no_delete`, `simulations_no_update` y `simulations_no_delete`. Sin `BEGIN` ni `COMMIT` (R-105).
  - `seedTaxRates(db): number` inserta las 7 tasas con `INSERT OR IGNORE` en una transacción y devuelve las filas insertadas. Una tasa borrada a mano se repone; una editada, no.
  - `npm run db:seed` (backend y raíz) no migra: sobre una BD sin migrar falla con `no such table: tax_rates`, porque la spec 4.7 separa los dos comandos.
  - `prepareDatabase(path): Db` abre, migra y siembra, y cierra la conexión si algo falla. Lo usan `server.ts`, que termina antes de `listen` si la migración falla, y `createTestDb()`. Su test en `seed.test.ts` cubre R-71 sobre un archivo nuevo en una carpeta temporal.
  - La conexión de `server.ts` sigue abierta, pero aún no se pasa a `createApp`: llegará con los repositorios.
  - `migrate.test.ts` abre `openDatabase(':memory:')`, porque `createTestDb()` ya trae `001_init.sql`.
  - Los tests de esquema se reparten entre `schema.test.ts` (simulations y propiedades generales), `schema.customers.test.ts` (customers y tax_rates) y `schemaRows.ts` (filas válidas, inserciones y `useTestDb()`), para respetar las 200 líneas por archivo.

### T-13 · Pipeline de recepción HTTP: 415, 413, 400 y 405 [3 h]
- **Objetivo:** middlewares transversales de Content-Type, `express.json` (10 kB, `strict: false`) con detección de body vacío, mapeo de los errores de body-parser y helper `.all()` para el 405.
- **Referencias:** spec 3.1 (paso 1), 5.1, RF-31.
- **Depende de:** T-10b.
- **Archivos:** `backend/src/http/contentType.ts`, `backend/src/http/jsonBody.ts`, `backend/src/http/methodNotAllowed.ts`, `errorHandler.ts` (mapear `entity.parse.failed` y `entity.too.large`) y `backend/test/http/reception.test.ts`. **Añadidos en T-13 (R-107):** `backend/src/shared/errors.ts` (subclases de `AppError`) y `architecture.md` (*Pendiente de verificar*).
- **Criterios:**
  - Sobre un router de prueba: JSON inválido → 400, body vacío → 400, `text/plain` → 415, body de más de 10 kB → 413, método no soportado → 405 `METHOD_NOT_ALLOWED`.
  - `application/json; charset=UTF-8` aceptado.
  - Queda fijado el punto «body vacío» de *Pendiente de verificar*.
- **Tests:** Supertest sobre una app mínima, sin CA (los CA-83 a CA-86 van en T-18 y T-19, R-86).
- **Fuera de alcance:** validación con zod y rutas reales.
- **Decisiones de T-13 (R-107):**
  - `requireJson` (`contentType.ts`) analiza la cabecera a mano, sin `req.is()`, que devuelve `null` cuando no hay body. Acepta `application/json` sin distinguir mayúsculas, sin parámetros o solo con `charset=utf-8`. Cualquier otro tipo, charset o parámetro, o la falta de cabecera → 415.
  - `jsonBody` = `express.json({ limit: 10kb, strict: false })` más la detección del body vacío. body-parser 2.4.0 convierte un body vacío en `{}`, así que un `verify` marca las peticiones que traen bytes; sin marca → 400 `MALFORMED_JSON`. Un body de solo espacios ya da 400 al parsear.
  - `receiveJson = [requireJson, ...jsonBody]` se monta en cada ruta POST (`.post(...receiveJson, handler)`), no en `app.ts`. Así un POST a una ruta inexistente da 404 y uno a una ruta solo GET da 405.
  - `methodNotAllowed` va con `router.route(...).all(methodNotAllowed)`. Sin cabecera `Allow`, porque la spec no la pide.
  - El `errorHandler` traduce `entity.parse.failed` → 400 y `entity.too.large` → 413. El resto de errores de body-parser (que `requireJson` evita) siguen dando 500.
  - Subclases `MalformedJsonError`, `PayloadTooLargeError`, `UnsupportedMediaTypeError` y `MethodNotAllowedError` en `shared/errors.ts`, con los mensajes `Malformed JSON`, `Payload too large`, `Unsupported media type` y `Method not allowed`.

### T-14 · Middleware `validate` y traductor de issues de zod [4 h]
- **Objetivo:** `validate({ body?, query?, params? })` con fábricas de schema, acumulación de errores en un solo 422, salida validada en `res.locals` y traducción de issues de zod 4 al catálogo 3.2.
- **Referencias:** RF-29, RF-31, spec 3.1 (pasos 2–5), 3.2, architecture §5 (traductor), ADR-002.
- **Depende de:** T-13.
- **Archivos:** `backend/src/http/validate.ts`, `backend/src/http/zodIssues.ts` y `backend/test/http/validate.test.ts`. **Añadidos en T-14 (R-108):** `backend/src/shared/errors.ts` (`ValidationError`) y `architecture.md` (*Pendiente de verificar*).
- **Criterios:**
  - Cada regla de la lista del traductor (architecture §5) produce su issue: `REQUIRED`, `INVALID_TYPE`, `UNKNOWN_FIELD` (una por clave), `OUT_OF_RANGE`, `INVALID_LENGTH`, `UNSUPPORTED_VALUE`, `INVALID_FORMAT` y `field: "body"`.
  - Un parámetro repetido da `INVALID_TYPE`; la clave `search[]` da `UNKNOWN_FIELD`.
  - Un decimal en un campo entero da `INVALID_TYPE`.
  - Quedan fijados los puntos de zod 4 de *Pendiente de verificar*.
- **Tests:** schemas sintéticos de prueba, sin módulos reales y sin CA.
- **Fuera de alcance:** los schemas concretos de cada endpoint.
- **Decisiones de T-14 (R-108):**
  - `translateIssues(issues, input, part)` (`zodIssues.ts`) da `REQUIRED` cuando el valor de entrada en la ruta del issue es `undefined` o `null`, sea cual sea el código: con zod 4.6.7 un enum ausente da `invalid_value`, no `invalid_type`. En la raíz no aplica: un body `null` da `field: "body"`, `INVALID_TYPE`.
  - Resto de reglas: `invalid_type` → `INVALID_TYPE`; `too_small`/`too_big` → `OUT_OF_RANGE` con `origin` `number`, `int` o `bigint`, `INVALID_LENGTH` en otro caso; `invalid_value` → `UNSUPPORTED_VALUE`; `invalid_format` → `INVALID_FORMAT`; `unrecognized_keys` → un `UNKNOWN_FIELD` por clave; `custom` con `params.issue` del catálogo → ese issue. Cualquier otro código, o un `custom` sin issue del catálogo → `INVALID_FORMAT`.
  - `field` es la ruta unida por `.`; en la raíz, el nombre de la parte. Si zod emite varios issues para un campo, se queda el primero.
  - `validate({ params?, query?, body? })` acepta un schema o una fábrica `() => schema` evaluada en cada petición, usa `safeParse` síncrono y junta los `details` en el orden `params` → `query` → `body` en un solo `ValidationError` (422 `VALIDATION_ERROR`, `Request validation failed`).
  - La salida va a `res.locals.validated` (`{ body, query, params }`, `undefined` en las partes sin schema) y se lee con `getValidated<B, Q, P>(res)`, cuyo tipo no se comprueba en tiempo de ejecución.
  - Sin cambios en `app.ts`: Express 5 ya usa el parser `simple`, y los tests lo fijan.

### T-15 · Schemas comunes: `:id`, paginación y query vacía [2 h]
- **Objetivo:** schemas reutilizables del parámetro `:id` (refine único → `INVALID_FORMAT`), de `page` y `pageSize` (`^[1-9][0-9]*$`, valores por defecto y rangos) y de la query vacía estricta, más los tipos de paginación.
- **Referencias:** RF-28, spec 3.5, spec 5.2 (`Page`).
- **Depende de:** T-14.
- **Archivos:** `backend/src/http/commonSchemas.ts`, `backend/src/shared/pagination.ts` (desde T-10, R-81) y `backend/test/http/commonSchemas.test.ts`.
- **Criterios:**
  - `0`, `abc`, `01`, `+1` y `1.0` se rechazan en `page` y en `:id`.
  - `2147483648` en `:id` da `INVALID_FORMAT`.
  - `pageSize` 101 da `OUT_OF_RANGE`.
  - Los valores por defecto son 1 y 20.
  - La query vacía estricta rechaza `?foo=1` con `UNKNOWN_FIELD`.
- **Tests:** unitarios a través de `validate`, sin CA (CA-75 va en T-20 y CA-79 en T-19, R-85).
- **Fuera de alcance:** el schema de `search` (T-20).
- **Decisiones de T-15 (R-109):**
  - Issues de `page` y `pageSize`: sin formato `^[1-9][0-9]*$` (`0`, `abc`, `01`, `+1`, `1.0`, vacío) → `INVALID_FORMAT`; por encima del máximo → `OUT_OF_RANGE`; repetido → `INVALID_TYPE`. `pageSize=0` da `INVALID_FORMAT`.
  - `shared/pagination.ts`: `PageParams`, `Page<T>` y las constantes `DEFAULT_PAGE` (1), `DEFAULT_PAGE_SIZE` (20), `MAX_PAGE_SIZE` (100) y `MAX_PAGE` (2 147 483 647). El máximo de `:id` es interno de `commonSchemas.ts`.
  - `commonSchemas.ts` exporta `idParamsSchema` (un único `refine` con `params.issue: 'INVALID_FORMAT'`, salida `number`), `paginationQueryFields` (shape que T-20 compone con `search`), `paginationQuerySchema` y `emptyQuerySchema`.
  - Las claves desconocidas van en `details` después de `page` y `pageSize`: zod emite `unrecognized_keys` al final. Sin cambios en `zodIssues.ts`.

---

## M3 · Endpoints

Todas las rutas de este hito cumplen además dos criterios (R-88): una query desconocida (`?foo=1`) da 422 `UNKNOWN_FIELD`, y un método no soportado da 405.

### T-16 · `GET /countries` y repositorio de tasas [2 h]
- **Objetivo:** módulo `countries` completo (repository, service, controller y routes) con `listCountries`, `getRateBp(code)` y `listCodes()`, que reutilizarán T-17 y T-21.
- **Referencias:** RF-08, RF-17, RF-32, spec 5.7.
- **Depende de:** T-12, T-15.
- **Archivos:** `backend/src/modules/countries/*` (4 archivos), `app.ts`, `server.ts`, `backend/test/helpers/createTestApp.ts` y `backend/test/api/countries.test.ts`.
- **Criterios:** CA-82; `?foo=1` → 422 `UNKNOWN_FIELD` (test sin CA; CA-77 va en T-20); `POST /countries` → 405.
- **Tests:** API.
- **Fuera de alcance:** nombres de país (los pone el frontend con `Intl.DisplayNames`).
- **Decisiones de T-16 (R-110):**
  - `AppDeps` recibe `db: Db`; `server.ts` le pasa la conexión de `prepareDatabase`. `createTestApp()` usa `createTestDb()` si no recibe `db`, y sigue devolviendo `Express`: el test que necesita la BD la crea y la pasa con `createTestApp({ db })`.
  - Fábricas sin clases: `createTaxRatesRepository(db)` (interfaz `TaxRatesRepository`), `createCountriesService`, `createCountriesController` y `createCountriesRouter`.
  - `listCountries()` y `listCodes()` ordenan por `code`; `getRateBp(code)` devuelve `undefined` si el código no existe (qué hacer en ese caso lo decide T-21). Sin caché: cada llamada lee `tax_rates`.
  - Las sustituciones de repositorios en `createApp` (CA-89) quedan para T-22.
  - Test extra sin CA: un cambio en `tax_rates` se ve en la petición siguiente.

### T-17 · Schema de alta de cliente [3–4 h]
- **Objetivo:** `buildCreateCustomerSchema(paísesSoportados)`, que encadena por campo normalización → formato → (checksum si `ES`), corta en el primer fallo de cada campo y ejecuta el checksum aunque fallen otros campos.
- **Referencias:** RF-01 a RF-06, RF-08, RF-09, spec 3.1, 3.3, architecture §2 (fábrica de schema) y §5.
- **Depende de:** T-08, T-09, T-14, T-16.
- **Archivos:** `backend/src/modules/customers/customers.schemas.ts` y `customers.schemas.test.ts`.
- **Criterios:**
  - Cada campo produce el issue de la tabla 3.3 para cada tipo de fallo.
  - El checksum se ejecuta aunque `email` haya fallado, y los dos errores se acumulan.
  - El país se valida contra la lista recibida; `" gb "` → `GB`.
- **Tests:** unitarios del schema pasando por `validate`, descriptivos y sin CA. Los CA del alta van todos en T-18 (R-85).
- **Fuera de alcance:** persistencia, 409 y ruta.
- **Decisiones de T-17 (R-111):**
  - Exporta `buildCreateCustomerSchema(supportedCountries)`, `PLANS` y el tipo `CreateCustomerInput` (`z.output`).
  - Cada campo: `z.string()` → `transform(normalizador del dominio)` → `superRefine` que traduce el resultado del dominio a un issue `custom` con `params.issue`. El email añade `.pipe(z.email())` tras la longitud.
  - `country`: trim, mayúsculas y refine contra la lista recibida (`UNSUPPORTED_VALUE`); no `z.enum`, que no admite una lista vacía. `plan`: trim, mayúsculas y `z.enum(PLANS)`.
  - Checksum: `superRefine` del objeto con `path: ['taxId']` y la opción `when` de zod 4. Se ejecuta si no hay issues en `taxId` ni en `country`, aunque fallen otros campos o haya claves desconocidas; solo valida si `country` es `ES` y emite `INVALID_FORMAT` o `INVALID_CHECKSUM`.
  - **Orden de `details`:** el de zod, con el checksum al final (`[email, taxId]`), distinto del ejemplo de 5.3, que es ilustrativo (decisión del usuario). Los tests de T-18 no deben depender del orden de ese ejemplo.

### T-18 · `POST /customers`: repositorio, service y ruta [3–4 h]
- **Objetivo:** persistir el cliente con `company_name_search`, traducir `SQLITE_CONSTRAINT_UNIQUE` en `DuplicateError` (409 `taxId`/`DUPLICATE`), responder 201 con `Location`, y montar la ruta con 415, 400, 413 y 405.
- **Referencias:** RF-01 a RF-10, RB-12, spec 3.3, 4.4, 5.3, architecture §5 (409 sin SELECT previo).
- **Depende de:** T-17.
- **Archivos:** en `backend/src/modules/customers/`: `customers.repository.ts`, `customers.service.ts`, `customers.controller.ts`, `customers.routes.ts`. Además, `app.ts`, `backend/test/helpers/customerFactory.ts`, `backend/test/api/customers.create.test.ts` y `backend/test/api/customers.taxid.test.ts`. **Añadido en T-18 (R-112):** `backend/src/shared/errors.ts` (`DuplicateError`).
- **Criterios:**
  - Alta y normalización: CA-38 a CA-49.
  - Identificador fiscal: CA-50 a CA-68 y CA-110.
  - Errores de recepción sobre esta ruta: CA-83, CA-84 y CA-85 (R-86).
  - `?foo=1` → 422 y `PUT /customers` → 405 (R-88).
- **Tests:** API.
- **Fuera de alcance:** GET de clientes y seed demo.
- **Decisiones de T-18 (R-112):**
  - `DuplicateError(field)` en `shared/errors.ts`: 409 `DUPLICATE`, mensaje `Resource already exists`, `details: [{ field, issue: 'DUPLICATE' }]`.
  - Repositorio: `createCustomersRepository(db)` con `insert(draft)`, un `INSERT … RETURNING` con parámetros con nombre. Un `SqliteError` con `code` `SQLITE_CONSTRAINT_UNIQUE` → `DuplicateError('taxId')`, sin SELECT previo: la única `UNIQUE` de la tabla es `(country_code, tax_id)`. El resto de errores de BD se propagan (500). Exporta `Customer` (recurso de 5.2, sin `company_name_search`) y `CustomerDraft`.
  - `plan` es `string` en la entidad: el repositorio no puede importar `PLANS` de `schemas`, y el CHECK de la tabla garantiza el valor.
  - Service: `createCustomersService(repo)` con `create(input)`, que calcula `companyNameSearch = searchKey(companyName)`. Define su propio tipo de entrada, `NewCustomer`, para no depender de zod; `CreateCustomerInput` es compatible.
  - Controller: lee `getValidated<NewCustomer>(res).body` y responde 201 con el `Customer` y `Location: /api/customers/{id}`.
  - Ruta: `createCustomersRouter(controller, supportedCountries)`. `supportedCountries` es una función que `app.ts` construye con `taxRatesRepo.listCodes()`, porque las rutas no pueden importar repositorios; se evalúa en cada petición dentro de la fábrica del schema. `POST /` monta `receiveJson` → `validate({ query: emptyQuerySchema, body })` → controller, y después `.all(methodNotAllowed)`.
  - Hasta T-20, `GET /api/customers` responde 405; T-20 añade el GET en la misma ruta.
  - Helper `customerFactory.ts`: `customerBody(overrides)`, `customerBodyWithout(field)` y `postCustomer(app, body)`.
  - Además de los CA, tests sin CA de: `Location`, `company_name_search` guardado y no expuesto, países leídos en cada petición, 413, body que no es objeto y campo desconocido. CA-110 compara `details` sin depender del orden (R-111).

### T-19 · `GET /customers/:id` [1–2 h]
- **Objetivo:** detalle de cliente con 404 y 422, y 405 para el resto de métodos sobre `/customers/:id`.
- **Referencias:** RF-10, RF-16, spec 3.5, 5.5.
- **Depende de:** T-18.
- **Archivos:** archivos del módulo `customers` (añadir `findById`) y `backend/test/api/customers.detail.test.ts`.
- **Criterios:** CA-78, CA-79 y CA-86; la respuesta no expone `company_name_search`; `?foo=1` → 422 (R-88).
- **Tests:** API.
- **Fuera de alcance:** búsqueda e historial.
- **Decisiones de T-19 (R-113):**
  - Repositorio: `findById(id)` es un `SELECT` con las mismas columnas que el `RETURNING` del alta (sin `company_name_search`) y devuelve `Customer | undefined`. Así T-21 lo reutiliza desde `simulations.service`.
  - Service: `getById(id)` lanza `NotFoundError()` si no existe (architecture §5), con el mensaje genérico `Resource not found`.
  - Controller: lee `getValidated<unknown, unknown, { id: number }>(res).params` y responde 200 con el `Customer`.
  - Ruta: `GET /:id` = `validate({ params: idParamsSchema, query: emptyQuerySchema })` → controller, más `.all(methodNotAllowed)`. `POST`, `PUT`, `PATCH` y `DELETE` dan 405 sin pasar por `receiveJson` (RF-10).
  - Además de los CA, tests sin CA de: 200 igual al 201 del alta y sin `company_name_search`, `id` fuera de rango o sin formato (`2147483648`, `01`, `+1`, `1.0`, `-1`) → `INVALID_FORMAT`, `2147483647` → 404, `?foo=1` → `UNKNOWN_FIELD`, acumulación `params` → `query`, y `PUT`/`PATCH`/`POST` → 405.

### T-20 · `GET /customers`: búsqueda y paginación [3–4 h]
- **Objetivo:** búsqueda OR por clave de nombre e identificador normalizado, con escapado de `\ % _` y `LIKE ? ESCAPE '\'`, rama de identificador omitida si normaliza a vacío, orden `company_name_search, id`, paginación con `total` y schema de `search`.
- **Referencias:** RF-11 a RF-15, RF-28, RB-13, spec 3.5, 5.2 (`Page`), 5.4.
- **Depende de:** T-19.
- **Archivos:** archivos del módulo `customers` y `backend/test/api/customers.search.test.ts`.
- **Criterios:** CA-69 a CA-77, CA-106, CA-107 y CA-109; `search=-` busca solo por nombre.
- **Tests:** API.
- **Fuera de alcance:** frontend.
- **Decisiones de T-20 (R-114):**
  - Schema: `searchCustomersQuerySchema` en `customers.schemas.ts` = `z.strictObject({ search, ...paginationQueryFields })`. `search` es `z.string()` → trim → `refine` de ≤ 100 code points (`INVALID_LENGTH`) → `.default('')`. El máximo se mide tras el trim (decisión del usuario). Exporta el tipo `SearchCustomersQuery`.
  - Service: `search({ search, page, pageSize })` devuelve `Page<Customer>`. Con `search` vacío no hay filtro (RF-14). Si no, `nameKey = searchKey(search)` y `taxIdKey = normalizeTaxId(search)`, que se omite si queda vacío (RF-13). Define su propio tipo de entrada, `CustomerSearch`, para no depender de zod.
  - Repositorio: `search(filter | undefined, { page, pageSize })` devuelve `{ items, total }`. Escapa `\ % _` y forma `%…%`. Una sola cláusula `WHERE @name IS NULL OR company_name_search LIKE @name ESCAPE '\' OR tax_id LIKE @taxId ESCAPE '\'`: `@taxId` nulo omite la rama. `total` sale de un `COUNT(*)`, y la página de `ORDER BY company_name_search, id LIMIT @limit OFFSET @offset`.
  - Controller: lee `getValidated(res).query` y responde 200. Ruta: `GET /` = `validate({ query: searchCustomersQuerySchema })` → controller, en la misma ruta que `POST /`. El resto de métodos sigue dando 405.
  - Limitación sin tratar: un `search` formado solo por marcas combinantes da una clave de nombre vacía y devuelve todos los clientes.

### T-21 · `POST /simulations/preview` y cálculo compartido [3–4 h]
- **Objetivo:** schema de simulación, service `quote(input)` dentro de una transacción síncrona (cliente → tasa → `calculateQuote`) reutilizable por el guardado, y ruta de preview que responde 200 sin persistir.
- **Referencias:** RF-19 a RF-24 (cálculo), RF-26, RB-04, RB-06, RB-10, spec 3.4, 5.9, architecture §4, ADR-004.
- **Depende de:** T-06, T-16, T-19 (`findById`, R-80).
- **Archivos:** en `backend/src/modules/simulations/`: `simulations.schemas.ts`, `simulations.service.ts`, `simulations.controller.ts`, `simulations.routes.ts`. Además, `app.ts` y `backend/test/api/simulations.preview.test.ts`. **Añadido en T-21 (R-115):** `backend/test/api/simulations.preview.validation.test.ts` y `backend/test/helpers/simulationFactory.ts`.
- **Criterios:**
  - CA-01 a CA-18 (CA-18 cambiando la tasa con `db` desde `createTestApp`).
  - CA-20, CA-24 (en el preview) y CA-28 a CA-37.
  - Los middlewares de recepción están montados: `text/plain` → 415 (test sin CA, R-86).
  - `?foo=1` → 422 y `GET /simulations/preview` → 405 (R-88).
- **Tests:** API.
- **Fuera de alcance:** persistencia, historial y CA-19.
- **Decisiones de T-21 (R-115):**
  - Schema: `simulationSchema` = `z.strictObject` con `z.int().min().max()` por campo (tabla 3.4), sin cambios en `zodIssues.ts`. El máximo de `customerId` es una constante local, no el `MAX_ID` de `commonSchemas.ts`. Exporta el tipo `SimulationInput`.
  - Service: `createSimulationsService({ customersRepo, taxRatesRepo, runInTransaction })`, con `Pick` de las interfaces de los dos repositorios. `preview(input)` ejecuta la función interna `quote` dentro de `runInTransaction`: `findById` (si no existe, `NotFoundError`) → `getRateBp(customer.country)` → `calculateQuote`. T-22 reutilizará `quote` en la misma transacción que el `insert`. Tipos propios `SimulationRequest` y `SimulationQuote`, sin zod.
  - Tasa inexistente: la FK `customers.country_code → tax_rates` lo impide, así que es un bug → `Error` normal (500), sin código nuevo.
  - `app.ts` construye `runInTransaction = (fn) => db.transaction(fn)()`: el service no importa better-sqlite3. El controller añade `currency: 'EUR'` y responde 200.
  - Ruta: `POST /preview` = `receiveJson` → `validate({ query: emptyQuerySchema, body: simulationSchema })` → controller, más `.all(methodNotAllowed)`. `/api/simulations` sin `/preview` sigue dando 404 hasta T-22.
  - Tests en dos archivos para no superar `max-lines`, con el helper `simulationFactory.ts` (`simulationBody`, `postPreview`, `createCustomerId`), que T-22 puede reutilizar.
  - CA-12 recorre `u` de 1 a 1000 contra un único servidor con `fetch` (conexiones keep-alive). Con supertest, una conexión por petición agotaba los puertos efímeros en Windows (`ENOBUFS`) al correr junto a las demás suites.

### T-22 · `POST /simulations` [2–3 h]
- **Objetivo:** repositorio de simulaciones (`insert` con `tiers_json` y `RETURNING`, mapeo de fila a entidad) y ruta que reutiliza `quote` y responde 201 sin `Location`.
- **Referencias:** RF-18, RF-24, RF-25, RB-09, RB-10, spec 4.5, 5.8.
- **Depende de:** T-21.
- **Archivos:** `backend/src/modules/simulations/simulations.repository.ts`, archivos del módulo, `app.ts` y `backend/test/api/simulations.create.test.ts`. **Añadido en T-22 (R-116):** `backend/test/helpers/simulationFactory.ts` (`postSimulation`).
- **Criterios:**
  - CA-21, CA-22, CA-24 (en el guardado), CA-25 y CA-89 (repositorio que falla, inyectado con `createApp(deps)`).
  - Los middlewares de recepción están montados: `text/plain` → 415 (test sin CA).
  - `?foo=1` → 422 (R-88).
- **Tests:** API.
- **Fuera de alcance:** historial.
- **Decisiones de T-22 (R-116):**
  - Repositorio: `createSimulationsRepository(db)` con `insert(draft): Simulation`. Hace `INSERT … RETURNING` con parámetros con nombre y guarda `tiers` en `tiers_json` con `JSON.stringify`. Al mapear la fila, `tiers_json` se lee con `JSON.parse`, sin recalcular (RB-09). Define `SimulationDraft` y `Simulation` (spec 5.2 sin `currency`). Un error de BD (CHECK, FK o trigger) no se traduce y da 500.
  - Service: dependencia nueva `simulationsRepo: Pick<SimulationsRepository, 'insert'>`. `save(input)` ejecuta `insert(quote(...))` dentro de una sola `runInTransaction`: es la misma función de cálculo que el preview (RB-10). El service reexporta el tipo `Simulation`, porque ESLint no deja que el controller importe el repositorio, ni siquiera sus tipos.
  - Controller: `create` responde 201 con los campos en el orden de 5.8 y `currency: 'EUR'`, sin `Location`.
  - Ruta: `POST /` = `receiveJson` → `validate({ query: emptyQuerySchema, body: simulationSchema })` → controller, más `.all(methodNotAllowed)`. `/simulations/:id` no existe y cae en el 404 final (CA-25).
  - CA-89: `AppDeps` admite un `simulationsRepo?: SimulationsRepository` opcional (decisión del usuario). Si no se pasa, `app.ts` usa `createSimulationsRepository(db)`.
  - Helper: `postSimulation` en `simulationFactory.ts` (decisión del usuario).

### T-23 · `GET /customers/:id/simulations` [2–3 h]
- **Objetivo:** historial paginado (`created_at DESC, id DESC`) que devuelve `tiers` guardados sin recalcular y responde 404 si el cliente no existe. Lo sirve el controller de `simulations`, montado bajo `/customers`.
- **Referencias:** RF-27, RF-28, RB-09, RB-11, spec 5.6.
- **Depende de:** T-22.
- **Archivos:** archivos del módulo `simulations`, `app.ts` y `backend/test/api/simulations.history.test.ts`. **Añadido en T-23 (R-117):** `backend/test/api/simulations.create.test.ts` (solo la anotación del sustituto de CA-89).
- **Criterios:**
  - CA-19, CA-23, CA-80 y CA-81.
  - Paginación: `pageSize` respetado y una página más allá del final devuelve `items: []`.
  - `id` inválido → 422; `?foo=1` → 422; `POST /customers/1/simulations` → 405 (R-88).
- **Tests:** API.
- **Fuera de alcance:** frontend.
- **Decisiones de T-23 (R-117):**
  - Repositorio: `listByCustomer(customerId, { page, pageSize })` devuelve `{ items, total }`. `total` sale de un `COUNT(*)` y la página de `ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset`, que sirve el índice del historial. Reutiliza `toSimulation`: `tiers_json` se lee sin recalcular (RB-09).
  - Service: `history({ customerId, page, pageSize })` devuelve `Page<Simulation>`. Ejecuta `findById` (si no existe, `NotFoundError`) y `listByCustomer` dentro de una sola `runInTransaction`, para que `items` y `total` salgan de la misma lectura. Tipo de entrada propio `HistoryRequest`, sin zod.
  - Controller: `history` lee `params.id` y la query validados y responde 200 con cada item en el formato de `POST /simulations` (`currency: 'EUR'`).
  - Ruta: `createCustomerSimulationsRouter` en `simulations.routes.ts`, con `GET /:id/simulations` = `validate({ params: idParamsSchema, query: paginationQuerySchema })` → controller, más `.all(methodNotAllowed)`. `app.ts` lo monta en `/api/customers`. Sin cambios en `simulations.schemas.ts`.
  - `AppDeps.simulationsRepo` pasa a `Partial<SimulationsRepository>`: `app.ts` lo combina con el repositorio real (`{ ...createSimulationsRepository(db), ...simulationsRepo }`), así que cada método se sustituye por separado (decisión del usuario). El sustituto de CA-89 se anota como `Partial<SimulationsRepository>` (decisión del usuario).
  - El orden por `createdAt` antes que por `id` y los `tiers` sin recalcular se prueban insertando filas con SQL directo en el test, porque por la API no se puede fijar `created_at` ni guardar un snapshot distinto del cálculo.

---

## M4 · Frontend

### T-24a · Shell de la aplicación [3 h]
- **Objetivo:** providers (QueryClient con `retry: false` y `refetchOnWindowFocus: false`, Router), layout con cabecera y pie, `global.css` con variables, páginas vacías con sus rutas, y reglas de capas del frontend en ESLint.
- **Referencias:** ADR-005, ADR-007, architecture §3.
- **Depende de:** T-23 (M3 terminado, R-94).
- **Archivos:** `frontend/src/main.tsx`, `frontend/src/app/router.tsx`, `frontend/src/app/queryClient.ts`, `frontend/src/app/Layout.tsx` y `Layout.module.css`, `frontend/src/pages/*` (3 placeholders), `frontend/src/global.css`, `frontend/.env.example`, `eslint.config.js` (reglas del frontend) y `frontend/src/test/lint/` (fixture y test).
- **Criterios:**
  - Las tres rutas renderizan su página.
  - `.env.example` tiene `VITE_API_URL` y `VITE_FX_URL`.
  - Lint: una feature que importa otra feature falla, salvo la superficie pública de `currency`; un `fetch` fuera de `api/` y `features/currency` falla (R-83).
- **Tests:** router y test de las reglas de ESLint.
- **Fuera de alcance:** componentes de estado compartidos (T-24b), llamadas HTTP y divisa.

### T-24b · Componentes de estado y paginación [2 h]
- **Objetivo:** componentes compartidos de carga, error con reintento, vacío y paginación.
- **Referencias:** RF-43 (estados por vista), RF-28 (paginación en la UI).
- **Depende de:** T-24a.
- **Archivos:** en `frontend/src/shared/`: `LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `Pagination.tsx`, un `.module.css` compartido y sus tests.
- **Criterios:** el botón de reintento llama a su callback; la paginación deshabilita «anterior» en la página 1 y «siguiente» en la última, calculada con `total` y `pageSize`.
- **Tests:** componentes.
- **Fuera de alcance:** datos reales.

### T-25 · Cliente HTTP y capa `api/` [2–3 h]
- **Objetivo:** cliente con `VITE_API_URL + /api`, `signal`, interpretación del formato 5.1 → `ApiError { status, code, details }`, funciones y tipos por recurso, y query keys.
- **Referencias:** RF-30 (consumo), spec 5.2–5.9, architecture §3.
- **Depende de:** T-24a.
- **Archivos:** `frontend/src/api/client.ts`, `frontend/src/api/types.ts`, `frontend/src/api/customers.ts`, `frontend/src/api/simulations.ts`, `frontend/src/api/countries.ts`, `frontend/src/api/queryKeys.ts` y `client.test.ts`.
- **Criterios:**
  - Un 422 produce un `ApiError` con `status` 422, `code` `VALIDATION_ERROR` y sus `details`.
  - Un fallo de red o una respuesta que no es JSON produce un `ApiError` con `code` `NETWORK_ERROR` (código solo del frontend) y `details: []` (R-91).
  - Abortar el `signal` rechaza con `AbortError` y no con `ApiError`.
- **Tests:** unitarios con `fetch` simulado.
- **Fuera de alcance:** hooks de TanStack (van en cada feature) y API de tipos de cambio.

### T-26 · Conversión de divisa (TDD) [2 h]
- **Objetivo:** `convert(cents, rate, currency)` con big.js `roundHalfUp`, decimales según `Intl.NumberFormat` y formato `es-ES`, como lógica pura.
- **Referencias:** RF-42, RB-14, RB-15, ADR-006.
- **Depende de:** T-24a.
- **Archivos:** `frontend/src/features/currency/conversion.ts` y `conversion.test.ts`.
- **Criterios:**
  - CA-97 (JPY: 22.732 + 4774 = 27.506) y CA-98 (USD: 183,80) como lógica.
  - La fila GBP de RB-15.
  - `1.005` redondea bien.
  - Los tests comparan contra la salida de `Intl.NumberFormat('es-ES')`, no contra literales.
- **Tests:** unitarios.
- **Fuera de alcance:** `<Money>` y `<MoneyTotal>` (T-28b, R-82), obtención de tipos y selector.

### T-27 · Cliente de tipos de cambio y `useFxRates` [2–3 h]
- **Objetivo:** fetch a `VITE_FX_URL` con `AbortSignal.timeout(5000)`, validación zod (`result`, cuatro divisas finitas > 0), `staleTime` desde `time_next_update_unix` y `gcTime: Infinity`.
- **Referencias:** RF-41, RF-43 (timeout y conservar caché), ADR-005.
- **Depende de:** T-24a.
- **Archivos:** `frontend/src/features/currency/fxClient.ts`, `useFxRates.ts` y sus tests.
- **Criterios:**
  - CA-103: cambiar de divisa varias veces no repite peticiones antes de caducar.
  - Una respuesta inválida se trata como fallo.
  - Si falla el refresco, se mantienen los datos anteriores.
  - El timeout pasa al estado de error.
- **Tests:** unitarios y de hook con timers falsos y `fetch` simulado.
- **Fuera de alcance:** UI del selector.

### T-28 · Contexto de divisa, selector y pie de atribución [3 h]
- **Objetivo:** `CurrencyProvider` (elección en `localStorage` dentro de try/catch; divisa efectiva EUR si no hay tipos), selector con estados de carga, error, deshabilitado y reintento, fecha de la tasa en `es-ES` y enlace de atribución en el pie.
- **Referencias:** RF-40, RF-41 (fecha y atribución), RF-43, RB-16.
- **Depende de:** T-27.
- **Archivos:** `frontend/src/features/currency/CurrencyContext.tsx`, `useCurrency.ts`, `CurrencySelector.tsx` y `CurrencySelector.module.css`, `frontend/src/app/Layout.tsx` y sus tests.
- **Criterios:**
  - CA-100, CA-101, CA-102 y CA-104.
  - La divisa elegida persiste entre dos rutas de prueba (test sin CA; CA-99 va en T-31b).
  - Un `localStorage` que lanza error no rompe la aplicación.
- **Tests:** componente con `fetch` simulado.
- **Fuera de alcance:** pintar importes.

### T-28b · `<Money>` y `<MoneyTotal>` [2 h]
- **Objetivo:** componentes que leen divisa y tipos de `useCurrency`: `<Money cents>` para importes sueltos y `<MoneyTotal baseCents taxCents>` como suma de los dos importes ya redondeados.
- **Referencias:** RF-42, RB-14, architecture §3 (Importes), R-82.
- **Depende de:** T-26, T-28.
- **Archivos:** `frontend/src/features/currency/Money.tsx`, `MoneyTotal.tsx` y sus tests.
- **Criterios:** CA-97 y CA-98 renderizados con un proveedor de tipos simulado; sin tipos, se muestra en EUR (RB-16).
- **Tests:** componentes.
- **Fuera de alcance:** páginas.

### T-29a · `useDebouncedValue` y `useCustomerSearch` [2 h]
- **Objetivo:** hook de debounce propio y hook de búsqueda paginada de clientes.
- **Referencias:** RF-34 (debounce 300 ms y vuelta a la página 1), architecture §3 (Debounce).
- **Depende de:** T-25.
- **Archivos:** `frontend/src/shared/useDebouncedValue.ts`, `frontend/src/features/customers/useCustomerSearch.ts` y sus tests.
- **Criterios:** el valor solo cambia 300 ms después del último cambio (timers falsos); un cambio de texto devuelve `page` a 1; la query usa el texto debounced.
- **Tests:** hooks con timers falsos.
- **Fuera de alcance:** UI.

### T-29b · Dashboard: buscador, listado y tarjetas [3 h]
- **Objetivo:** buscador, listado paginado de tarjetas con enlace al detalle y botón de alta. Sin KPIs.
- **Referencias:** RF-34, RF-43 (estados), RF-44.
- **Depende de:** T-29a, T-24b.
- **Archivos:** en `frontend/src/features/customers/`: `CustomerSearch.tsx`, `CustomerList.tsx`, `CustomerCard.tsx` y un `.module.css` compartido. Además, `frontend/src/pages/Dashboard.tsx` y su test.
- **Criterios:**
  - CA-90; CA-105 en el listado; estados de carga, error con reintento y vacío.
  - Cada tarjeta muestra nombre de empresa, identificador fiscal, país (con `Intl.DisplayNames`) y plan, y enlaza a `/customers/:id` (decisión 2).
- **Tests:** componentes con `fetch` simulado.
- **Fuera de alcance:** formulario y detalle.

### T-30 · Formulario de alta de cliente [3–4 h]
- **Objetivo:** formulario con `useCountries` y `Intl.DisplayNames`, enum de planes, validación local (obligatorios y longitudes tras trim y colapso), `useCreateCustomer` y errores de `details[]` junto a cada campo, incluido el 409.
- **Referencias:** RF-36, RF-37, spec 3.7.
- **Depende de:** T-24b, T-25 (R-94).
- **Archivos:** en `frontend/src/features/customers/`: `NewCustomerForm.tsx` y su `.module.css`, `plans.ts`, `useCountries.ts`, `useCreateCustomer.ts`. Además, `frontend/src/pages/NewCustomer.tsx` y su test.
- **Criterios:**
  - CA-94, CA-95 y CA-96; el algoritmo del identificador no se ejecuta en el cliente.
  - Tras un 201, navega al detalle del cliente creado (`/customers/{id}`) e invalida la búsqueda de clientes (decisión 1).
- **Tests:** componente con `fetch` simulado.
- **Fuera de alcance:** el contenido del detalle (T-31a).

### T-31a · Detalle del cliente: tarjeta de datos [2–3 h]
- **Objetivo:** `useCustomer`, tarjeta responsive con los datos del cliente y página de detalle con sus estados.
- **Referencias:** RF-35, RF-43, RF-44.
- **Depende de:** T-25, T-24b, T-28b.
- **Archivos:** `frontend/src/features/customers/useCustomer.ts`, `CustomerDetailCard.tsx` y su `.module.css`, `frontend/src/pages/CustomerDetail.tsx` y su test.
- **Criterios:** CA-105 en el detalle; un id inexistente (404) muestra «cliente no encontrado» sin botón de reintento (R-91); otros errores muestran reintento.
- **Tests:** componentes.
- **Fuera de alcance:** historial y simulador.

### T-31b · Historial de simulaciones [3 h]
- **Objetivo:** `useSimulationHistory`, historial paginado con fecha, usuarios, GB, llamadas, base, impuesto, total y tasa, y desplegable de tramos con cada subtotal convertido por separado.
- **Referencias:** RF-35, RF-40 (historial y tarjetas), RB-14 (tramos).
- **Depende de:** T-31a, T-29b.
- **Archivos:** en `frontend/src/features/simulation/`: `useSimulationHistory.ts`, `SimulationHistory.tsx`, `TierBreakdown.tsx` y un `.module.css` compartido. Además, su test.
- **Criterios:** CA-99 navegando de dashboard a detalle con USD; CA-91 verificado a mano (360 px y escritorio); estados de carga, error y vacío.
- **Tests:** componentes.
- **Fuera de alcance:** simulador.

### T-32 · Simulador con preview en tiempo real [3–4 h]
- **Objetivo:** slider de 1–500 y controles de GB y llamadas dentro de los rangos de 3.4, `usePreview` (key con valores debounced a 250 ms, `signal`, última proyección válida conservada con aviso) y proyección con base, impuesto, total y tramos.
- **Referencias:** RF-38, RF-43 (fallo del preview), spec 1.7 (slider frente a API), 3.7, ADR-005.
- **Depende de:** T-31b.
- **Archivos:** en `frontend/src/features/simulation/`: `Simulator.tsx` y su `.module.css`, `Projection.tsx`, `usePreview.ts` y sus tests.
- **Criterios:**
  - CA-92.
  - Solo se pinta la última respuesta; las anteriores se cancelan.
  - Si el preview falla, se mantiene la proyección anterior con un aviso.
- **Tests:** componente y hook con timers falsos.
- **Fuera de alcance:** guardado.

### T-33 · Guardado de simulación [2 h]
- **Objetivo:** `useSaveSimulation`, botón deshabilitado mientras `isPending`, invalidación del historial con vuelta a la página 1 y formulario que conserva sus valores.
- **Referencias:** RF-39.
- **Depende de:** T-32.
- **Archivos:** archivos de `frontend/src/features/simulation/` y sus tests.
- **Criterios:** CA-93; el doble clic produce una sola petición.
- **Tests:** componente.
- **Fuera de alcance:** idempotency key (descartada por la spec).

---

## M5 · Cierre

### T-34 · Seed de clientes demo [2 h]
- **Objetivo:** `npm run db:seed:demo`, que crea clientes de ejemplo a través del service, nunca con SQL directo, para que pasen la normalización y el checksum.
- **Referencias:** architecture §1 (`db/`), ADR-003. No aparece en la spec (R-93).
- **Depende de:** T-22.
- **Archivos:** `backend/src/db/seedDemo.ts`, el script en `package.json` y `backend/test/db/seedDemo.test.ts`.
- **Criterios:** si ya hay clientes, no inserta nada y lo indica por consola; dos ejecuciones dejan el mismo número de filas (R-91); `createTestApp` nunca lo ejecuta. Solo crea clientes, sin simulaciones (decisión 3).
- **Tests:** ejecuta el seed sobre `:memory:` dos veces y comprueba el número de filas.
- **Fuera de alcance:** el seed de tasas.

### T-35 · README [1–2 h]
- **Objetivo:** qué es, requisitos (Node 24), arranque en pocos pasos, scripts, variables de entorno y limitaciones documentadas (spec 1.7).
- **Referencias:** RNF-01, RNF-02, spec 4.7.
- **Depende de:** T-34.
- **Archivos:** `README.md` y la sección «Comandos» de CLAUDE.md (solo si me lo pides).
- **Criterios:** un clon limpio arranca siguiendo el README.
- **Tests:** —
- **Fuera de alcance:** ADR nuevos.

### T-36 · Revisión final contra la spec y trazabilidad [3 h]
- **Objetivo:** matriz de trazabilidad CA → test, script opcional en CI que extrae los `CA-\d+` de los tests y los compara con la spec, verificación manual de CA-91 y lista de desviaciones.
- **Referencias:** spec 6.10, architecture §6.
- **Depende de:** T-35.
- **Archivos:** `ai-workspace/` (matriz), `scripts/check-ca.ts` (opcional) y `ci.yml`.
- **Criterios:** todos los CA tienen al menos un test o están marcados como manuales.
- **Tests:** el script en CI.
- **Fuera de alcance:** funcionalidades nuevas.

---

## Observaciones (no aplicadas al plan, a tu criterio)

1. **CI antes (T-04 justo después de T-01).** «Cada tarea se integra en main con tests en verde» solo se comprueba de forma automática si el CI ya existe. Moverlo cuesta lo mismo y protege T-02 y T-03.
2. **M3 era un solo punto.** «Todos los GET y POST» supera con mucho las 4 h. Lo he dividido en T-16 a T-23 sin alterar tu orden. He empezado por `GET /countries` porque es el más simple, valida el cableado completo y lo necesita el schema de clientes.
3. **Faltaba en el esquema:**
   - Reglas de capas en ESLint (T-03 y T-24a).
   - CORS, 404 y 500 (T-10b).
   - Pipeline 415/413/400/405 (T-13).
   - Schemas comunes (T-15).
   - `createTestApp` (T-10b a T-12).
   - Componentes de estado compartidos (T-24b).
   - Pie de atribución de open.er-api (T-28).
4. **El seed demo podría ir antes de M4.** Solo depende de T-22, y tener datos reales ayuda a desarrollar y probar el frontend a mano. Propongo moverlo justo después de T-23.
5. **La divisa no depende de la API.** T-26 y T-27 podrían hacerse en paralelo con M3. Los mantengo en M4 por tu criterio de «frontend cuando la API esté terminada».
6. **Riesgo de Express 5 y zod 4** (*Pendiente de verificar* de architecture). Queda fijado pronto, en T-13 y T-14. Si algo no se comporta como se espera, se corrige ahí antes de que lo usen los endpoints.
7. **CA fuera del rango CA-01–CA-107 y el hueco de CA-108.** La spec también tiene CA-109 (de R-69) y CA-110 (de R-70), que incluyo en la matriz. Ninguna revisión crea un CA-108: lo trato como un error de rango en R-78, que debería decir «CA-109 y CA-110». No invento un CA nuevo, porque manda la spec. Lo que sí faltaba es cobertura para R-71 (migrar y cargar las tasas al arrancar), aplicada en la v1.1 sin CA. La cubro con un test sin CA en T-12. Si prefieres que tenga un CA formal, añádelo a la spec y lo enlazo.
8. **`errorHandler` adelantado (R-81).** Tu esquema pone «Errores y validaciones» en el tercer punto de M2, pero el handler mínimo, `AppError` y el 404 van en T-10b. Sin ellos, `app.ts` no puede responder ningún error con el formato 5.1 y los tests de T-11 en adelante no pueden comprobarlo. La parte delicada (traductor y `validate`) sigue en el tercer punto (T-13 a T-15). Si no lo apruebas, T-10b arranca con el 404 por defecto de Express y el handler pasa a T-13.
9. **Seed demo fuera de la spec (R-93).** Está en architecture §1 y en tu esquema, pero no en la spec. Habría que añadir `db:seed:demo` a la spec 4.7 o documentarlo como herramienta de desarrollo fuera del contrato.

### Respuestas a tus dudas
- **¿El traductor de zod va con el middleware de errores?** No. Es la pieza más delicada (architecture §5) y la que fija los puntos sin verificar de zod 4. El `errorHandler` va en T-10b y el traductor con `validate` en T-14.
- **¿Separar el alta de cliente en dos tareas?** Sí: T-17 para el schema (normalización, checksum cruzado) y T-18 para persistencia, 409, ruta y todos los CA del alta. T-17 se integra sola porque sus tests unitarios pasan por `validate`.
- **¿La conversión de divisa necesita una tarea propia con TDD?** Sí, T-26. Es lógica de dinero con casos frágiles (`1.005`, JPY sin decimales, total como suma) y tiene CA exactos (97 y 98). CLAUDE.md solo exige TDD en `domain/`, pero propongo aplicar el mismo flujo aquí: primero los tests y luego tu OK.

### Decisiones sobre las preguntas abiertas
La spec no las fija; se elige la opción mínima coherente con ella.
1. **(T-30) Tras un alta correcta, el frontend navega al detalle del cliente creado.** El flujo natural es simular justo después del alta (RF-38 vive en el detalle), y el 201 ya devuelve el `id`.
2. **(T-29b) La tarjeta del listado enlaza al detalle** y muestra nombre de empresa, identificador fiscal, país y plan. Son los campos por los que se busca (RF-11) y los que identifican al cliente. El email y la fecha de alta quedan para la tarjeta del detalle (RF-35).
3. **(T-34) El seed demo solo crea clientes.** No está en la spec (R-93), así que se limita a lo imprescindible para probar a mano. Las simulaciones se generan desde el simulador, sin depender de otro camino de escritura.

---

## Matriz de cobertura

Primero la tarea con el test de API (o de componente, en el frontend). Entre paréntesis, la tarea que lo cubre además como lógica pura (dominio o conversión). Cuando aparecen dos tareas sin paréntesis, el motivo está en la última columna.

| CA | Tarea | Motivo si hay más de una |
|---|---|---|
| 01–08 | T-21 (T-05) | — |
| 09–11 | T-21 | — |
| 12 | T-21 (T-05) | — |
| 13–18 | T-21 (T-06) | — |
| 19 | T-23 | — |
| 20 | T-21 | — |
| 21–22 | T-22 | — |
| 23 | T-23 | — |
| 24 | T-21, T-22 | Mismo 404 en dos endpoints distintos (preview y guardado) |
| 25 | T-22 | — |
| 26–27 | T-12 | — |
| 28–37 | T-21 | — |
| 38 | T-18 | — |
| 39–41 | T-18 (T-09) | — |
| 42 | T-18 | — |
| 43 | T-18 (T-09) | — |
| 44 | T-18 | — |
| 45 | T-18 (T-09) | — |
| 46–49 | T-18 | — |
| 50 | T-18 (T-07) | — |
| 51 | T-18 (T-09) | — |
| 52–54 | T-18 (T-07) | — |
| 55–59 | T-18 (T-08) | — |
| 60–62 | T-18 (T-07) | — |
| 63 | T-18 | — |
| 64–65 | T-18 (T-09) | — |
| 66–68 | T-18 | — |
| 69–70 | T-20 (T-09) | — |
| 71–77 | T-20 | — |
| 78–79 | T-19 | — |
| 80–81 | T-23 | — |
| 82 | T-16 | — |
| 83–85 | T-18 | — |
| 86 | T-19 | — |
| 87 | T-10b | — |
| 88 | T-10b y todas las de API | El formato aplica a «cualquier error» |
| 89 | T-22 | — |
| 90 | T-29b | — |
| 91 | T-31b, **manual** (T-36) | — |
| 92 | T-32 | — |
| 93 | T-33 | — |
| 94–96 | T-30 | — |
| 97–98 | T-28b (T-26) | — |
| 99 | T-31b | — |
| 100–102 | T-28 | — |
| 103 | T-27 | — |
| 104 | T-28 | — |
| 105 | T-29b, T-31a | Tarjetas distintas: listado y detalle |
| 106–107 | T-20 | — |
| 109 | T-20 | — |
| 110 | T-18 | — |

**CA sin tarea:** ninguno. **CA sin test automático:** CA-91 (verificación manual en T-31b y registrada en T-36). **CA inexistente:** CA-108 (error de rango en R-78; ver la observación 7).

---

## Verificación del plan
- Cada tarea termina con lint, typecheck y test en verde en local y en CI (desde T-04).
- Los nombres de los tests llevan su CA; T-36 comprueba de forma automática que no queda ningún CA sin test.
- Revisión manual final: arranque desde un clon limpio con el README y recorrido de CA-91 en 360 px y en escritorio.
