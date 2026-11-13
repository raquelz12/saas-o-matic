# SaaS-O-Matic — Plan de implementación (v.01)

## Contexto

Ya están cerradas la spec (v1.1), la arquitectura y los ADR 001–007. Este plan desarrolla tu esquema ([esquema-inicial.md](ai-workspace/03-plan/esquema-inicial.md)) en tareas T-XX que se pueden integrar en main una a una. Mantiene tus hitos y su orden (M0 → M5). Donde un punto del esquema pasaba de 4 h, lo he dividido sin cambiar el orden. Lo que creo que convendría reordenar o añadir va aparte, en la sección **Observaciones**.

Reglas comunes a todas las tareas:
- **Definición de terminado:** `npm run lint`, `npm run typecheck` y `npm test` en verde.
- **Estimación:** la de cada tarea va entre corchetes.
- **Tests:** se nombran con su CA (`CA-XX: …`).
- **Dominio:** en las tareas `domain/`, primero se escriben los tests y se espera tu OK (CLAUDE.md).
- **Dependencias:** las que necesita cada tarea aparecen en su ficha y requieren tu aprobación antes de instalarlas.

---

## M0 · Estructura

### T-01 · Monorepo raíz y workspace backend [3 h]
- **Objetivo:** dejar el monorepo con npm workspaces, TypeScript estricto, Prettier, ESLint base y Vitest funcionando en el backend.
- **Referencias:** RNF-01, spec 4.7 (puertos y scripts), ADR-001.
- **Depende de:** —
- **Archivos:** `package.json` (workspaces, `engines`, scripts `lint`, `typecheck`, `test`), `.nvmrc`, `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`), `.prettierrc`, `eslint.config.js` (base, `no-explicit-any`), `.gitignore`, `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/test/smoke.test.ts`.
- **Dependencias a aprobar:** typescript, vitest, eslint, typescript-eslint, prettier, tsx (ejecutar TS en dev y en los scripts `db:*`).
- **Criterios:** `npm ci && npm run lint && npm run typecheck && npm test` pasa desde la raíz con Node 22; `engines.node` es `22.x`.
- **Tests:** un smoke test trivial en el backend.
- **Fuera de alcance:** frontend, reglas de capas, CI y cualquier código de la aplicación.

### T-02 · Workspace frontend [2 h]
- **Objetivo:** añadir el workspace `frontend/` con Vite, React, Vitest y Testing Library, y un `npm run dev` que arranque los dos workspaces.
- **Referencias:** RNF-01, spec 4.7 (`concurrently`, puerto 5173).
- **Depende de:** T-01.
- **Archivos:** `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/main.tsx` (mínimo), `frontend/src/test/setup.ts`, `frontend/src/App.test.tsx` (smoke), y el script `dev` en el `package.json` raíz.
- **Dependencias a aprobar:** react, react-dom, vite, @vitejs/plugin-react, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, concurrently.
- **Criterios:** `npm run dev` levanta Vite en 5173 (el backend todavía es un placeholder); lint, typecheck y test en verde en los dos workspaces.
- **Tests:** un smoke test de render con Testing Library.
- **Fuera de alcance:** router, TanStack Query, estilos y `.env.example` del frontend.

### T-03 · Reglas de capas y de tamaño en ESLint [3 h]
- **Objetivo:** imponer la tabla de capas de architecture §2 y §3 y los límites de tamaño con `no-restricted-imports` por glob.
- **Referencias:** ADR-007, architecture §2 y §3, reglas de código de CLAUDE.md.
- **Depende de:** T-01, T-02.
- **Archivos:** `eslint.config.js`, más fixtures con imports prohibidos y su test en `backend/test/lint/` y `frontend/src/test/lint/`. Los fixtures quedan excluidos del lint normal.
- **Criterios:**
  - `domain/` que importa `express` o `zod` falla.
  - Un controller que importa un repository falla.
  - `http/` que importa `modules/*` falla.
  - Una feature que importa otra feature falla, salvo la superficie pública de `currency`.
  - `max-lines` 200 y `max-lines-per-function` 40 activos.
- **Tests:** un test que ejecuta la API de ESLint sobre los fixtures y comprueba qué reglas saltan.
- **Fuera de alcance:** CI y código de la aplicación.

### T-04 · GitHub Actions [1 h]
- **Objetivo:** ejecutar lint, typecheck y test en cada PR y en cada push a main.
- **Referencias:** CLAUDE.md (Stack general).
- **Depende de:** T-03.
- **Archivos:** `.github/workflows/ci.yml`.
- **Criterios:** el workflow usa `node-version-file: .nvmrc` y `npm ci`, compila better-sqlite3 (módulo nativo, ADR-003) y un PR de prueba sale en verde.
- **Tests:** el propio CI.
- **Fuera de alcance:** el script de cobertura de CA (va en T-36) y cualquier despliegue.

---

## M1 · Dominio (TDD: primero los tests, espero tu OK y luego implemento)

### T-05 · Tramos de precio (`pricing`) [2 h]
- **Objetivo:** función pura que, dados los usuarios, devuelve la base y los tramos (`Tier[]`, solo los que tienen `units > 0`).
- **Referencias:** RF-21, RB-01, RB-02, RB-03, spec 5.2 (`Tier`).
- **Depende de:** T-01.
- **Archivos:** `backend/src/modules/simulations/domain/pricing.ts` y `pricing.test.ts`.
- **Criterios:** CA-01 a CA-08 a nivel de unidad; CA-12 como propiedad para todo `u` en 1..1000.
- **Tests:** un test por fila de RB-03, más la propiedad Σ subtotales = base.
- **Fuera de alcance:** impuesto, validación de rangos (es del schema) y persistencia.

### T-06 · Impuesto half-up y `calculateQuote` [2 h]
- **Objetivo:** `taxCents(base, rateBp)` en aritmética entera y `calculateQuote(users, rateBp)`, que devuelve base, impuesto, total y tramos.
- **Referencias:** RF-22, RB-05, RB-07, RB-08, ADR-006.
- **Depende de:** T-05.
- **Archivos:** `backend/src/modules/simulations/domain/money.ts` y `money.test.ts`, y `calculateQuote` (en `pricing.ts` o en un `quote.ts` propio, dentro del límite de tamaño).
- **Criterios:** los valores de CA-13 a CA-17 y CA-18 (2105 bp → 211) a nivel de unidad; `total = base + impuesto` siempre.
- **Tests:** la tabla RB-07, el caso RB-08 y casos límite de half-up (x,5 sube; x,4999 baja).
- **Fuera de alcance:** lectura de tasas y transacciones.

### T-07 · Identificador fiscal español: detección, DNI, NIE y NIF especial [3 h]
- **Objetivo:** `validateSpanishTaxId(normalizado)`, que devuelve `OK`, `INVALID_FORMAT` o `INVALID_CHECKSUM`, con detección por posiciones (sin regex) para DNI, NIE y K/L/M.
- **Referencias:** RF-05, spec 3.6.1–3.6.5 y 3.6.8.
- **Depende de:** T-01.
- **Archivos:** `backend/src/modules/customers/domain/taxId.ts` y `taxId.test.ts`.
- **Criterios:** filas de la tabla 3.6.7 de DNI, NIE y K/L/M; CA-50 a CA-54, CA-60, CA-61 y CA-62 (longitud ≠ 9) a nivel de unidad; `00000000T` y `X0000000T` válidos; `12345678U` y `123456789` dan `INVALID_FORMAT`.
- **Tests:** tabla parametrizada con los casos de 3.6.7 que aplican.
- **Fuera de alcance:** CIF (T-08) y normalización (T-09).

### T-08 · Identificador fiscal español: CIF [2 h]
- **Objetivo:** añadir el algoritmo del CIF y la forma de control que exige cada letra inicial.
- **Referencias:** RF-05, spec 3.6.6.
- **Depende de:** T-07.
- **Archivos:** `taxId.ts` (o `cif.ts` si se supera el límite de tamaño) y sus tests.
- **Criterios:** CA-55 a CA-59 a nivel de unidad; `B1234567K` da `INVALID_FORMAT`; `A87654323` es válido.
- **Tests:** las filas CIF de 3.6.7 y un caso de cada grupo de letras (solo letra, solo dígito, ambos).
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
  - CA-39, CA-40, CA-41, CA-43, CA-45, CA-51 (normalización), CA-64 y CA-65 a nivel de unidad.
- **Tests:** casos por función, incluidos NBSP, U+200B, U+202E y emoji con ZWJ.
- **Fuera de alcance:** zod, el escapado de LIKE (va en el repositorio, T-20) y country y plan (trim y mayúsculas triviales, en el schema).

---

## M2 · Base del backend

### T-10 · Config, logger, errores, `createApp` y `server` [3–4 h]
- **Objetivo:** esqueleto ejecutable del backend: env validado, logger, jerarquía `AppError`, `errorHandler` central, CORS, 404 de respaldo, `createApp(deps)` y `server.ts`.
- **Referencias:** RF-30, RF-31, RNF-02, RNF-03, spec 5.1 (CORS y formato de error), ADR-002, architecture §5.
- **Depende de:** T-03.
- **Archivos:**
  - `backend/src/config/`, `backend/src/shared/errors.ts`, `backend/src/shared/logger.ts`, `backend/src/shared/pagination.ts` (tipos).
  - `backend/src/http/errorHandler.ts` y `backend/src/http/notFound.ts`.
  - `backend/src/app.ts`, `backend/src/server.ts`, `backend/.env.example`.
  - `backend/test/helpers/createTestApp.ts` (versión inicial).
- **Dependencias a aprobar:** express@5, cors, zod@4, supertest, @types/express, @types/cors, @types/supertest.
- **Criterios:**
  - CA-87: `GET /api/inexistente` → 404 `NOT_FOUND`.
  - CA-88: formato `{ error: { code, message, details } }`.
  - CA-89 a nivel de handler: un `Error` desconocido → 500 con mensaje genérico y la traza solo en el logger.
  - `OPTIONS` de preflight → 204.
  - `HOST` por defecto `127.0.0.1`.
  - Un env inválido aborta el arranque.
- **Tests:** API (Supertest) sobre CA-87 y el preflight; test unitario del `errorHandler`; test del schema de config.
- **Fuera de alcance:** BD, body JSON, 415/413/400, 405 y validación.

### T-11 · Conexión SQLite, runner de migraciones y seed de tasas [3 h]
- **Objetivo:** conexión con `PRAGMA foreign_keys = ON`, runner de migraciones numeradas e idempotentes, seed `INSERT OR IGNORE` de `tax_rates`, scripts `db:migrate` y `db:seed`, y migración más seed al arrancar.
- **Referencias:** RF-32, spec 4.1, 4.3 (seed) y 4.7, ADR-003.
- **Depende de:** T-10.
- **Archivos:** `backend/src/db/connection.ts`, `backend/src/db/migrate.ts`, `backend/src/db/seedTaxRates.ts`, `backend/migrations/` (con una migración mínima para probar el runner), scripts en `package.json`, `server.ts` y `createTestApp` (`:memory:`).
- **Dependencias a aprobar:** better-sqlite3 y @types/better-sqlite3.
- **Criterios:**
  - Ejecutar el runner dos veces no hace nada la segunda.
  - El seed no revierte una tasa editada a mano.
  - `foreign_keys` vale 1 en cada conexión.
  - Arrancar sobre una BD vacía deja migraciones y tasas aplicadas sin pasos manuales (R-71, spec 4.7; no tiene CA).
- **Tests:** `backend/test/db/` (idempotencia, orden, seed no destructivo y arranque sobre BD vacía).
- **Fuera de alcance:** el esquema completo (T-12).

### T-12 · Esquema `001_init.sql` y tests de BD [2–3 h]
- **Objetivo:** crear las tablas `STRICT`, los `CHECK`, `UNIQUE`, índices y triggers de inmutabilidad tal como dice la spec.
- **Referencias:** RF-10, RF-25, RF-33, spec 4.3–4.5.
- **Depende de:** T-11.
- **Archivos:** `backend/migrations/001_init.sql` (sustituye a la mínima de T-11 si no llegó a main con datos) y `backend/test/db/schema.test.ts`.
- **Criterios:** CA-26 (`UPDATE` o `DELETE` sobre `simulations` aborta), CA-27 (`CHECK` de `total_cents`), lo mismo para `customers`, la FK hacia `tax_rates` y `UNIQUE(country_code, tax_id)`.
- **Tests:** better-sqlite3 directo, sin pasar por la API.
- **Fuera de alcance:** repositorios.

### T-13 · Pipeline de recepción HTTP: 415, 413, 400 y 405 [3 h]
- **Objetivo:** middlewares transversales de Content-Type, `express.json` (10 kB, `strict: false`) con detección de body vacío, mapeo de los errores de body-parser y helper `.all()` para el 405.
- **Referencias:** spec 3.1 (paso 1), 5.1, RF-31.
- **Depende de:** T-10.
- **Archivos:** `backend/src/http/contentType.ts`, `backend/src/http/jsonBody.ts`, `backend/src/http/methodNotAllowed.ts`, `errorHandler.ts` (mapear `entity.parse.failed` y `entity.too.large`) y `backend/test/http/`.
- **Criterios:**
  - CA-83, CA-84 y CA-85 sobre un router de prueba montado en el test.
  - 413 con un body de más de 10 kB.
  - `application/json; charset=UTF-8` aceptado.
  - 405 con `METHOD_NOT_ALLOWED`.
  - Queda fijado el punto «body vacío» de *Pendiente de verificar*.
- **Tests:** Supertest sobre una app mínima montada con estos middlewares.
- **Fuera de alcance:** validación con zod y rutas reales.

### T-14 · Middleware `validate` y traductor de issues de zod [4 h]
- **Objetivo:** `validate({ body?, query?, params? })` con fábricas de schema, acumulación de errores en un solo 422, salida validada en `res.locals` y traducción de issues de zod 4 al catálogo 3.2.
- **Referencias:** RF-29, RF-31, spec 3.1 (pasos 2–5), 3.2, architecture §5 (traductor), ADR-002.
- **Depende de:** T-13.
- **Archivos:** `backend/src/http/validate.ts`, `backend/src/http/zodIssues.ts` y `backend/test/http/validate.test.ts`.
- **Criterios:**
  - Cada regla de la lista del traductor (architecture §5) produce su issue: `REQUIRED`, `INVALID_TYPE`, `UNKNOWN_FIELD` (una por clave), `OUT_OF_RANGE`, `INVALID_LENGTH`, `UNSUPPORTED_VALUE`, `INVALID_FORMAT` y `field: "body"`.
  - Un parámetro repetido da `INVALID_TYPE`; la clave `search[]` da `UNKNOWN_FIELD`.
  - Un decimal en un campo entero da `INVALID_TYPE`.
  - Quedan fijados los puntos de zod 4 de *Pendiente de verificar*.
- **Tests:** schemas sintéticos de prueba, sin módulos reales.
- **Fuera de alcance:** los schemas concretos de cada endpoint.

### T-15 · Schemas comunes: `:id`, paginación y query vacía [2 h]
- **Objetivo:** schemas reutilizables del parámetro `:id` (refine único → `INVALID_FORMAT`), de `page` y `pageSize` (`^[1-9][0-9]*$`, valores por defecto y rangos) y de la query vacía estricta.
- **Referencias:** RF-28, spec 3.5.
- **Depende de:** T-14.
- **Archivos:** `backend/src/http/commonSchemas.ts` y su test.
- **Criterios:**
  - `0`, `abc`, `01`, `+1` y `1.0` se rechazan.
  - `2147483648` en `:id` da `INVALID_FORMAT`.
  - `pageSize` 101 da `OUT_OF_RANGE`.
  - Los valores por defecto son 1 y 20.
  - CA-75 y CA-79 a nivel de schema.
- **Tests:** unitarios a través de `validate`.
- **Fuera de alcance:** el schema de `search` (T-20).

---

## M3 · Endpoints

### T-16 · `GET /countries` y repositorio de tasas [2 h]
- **Objetivo:** módulo `countries` completo (repository, service, controller y routes) con `listCountries`, `getRateBp(code)` y `listCodes()`, que reutilizarán T-17 y T-21.
- **Referencias:** RF-08, RF-17, RF-32, spec 5.7.
- **Depende de:** T-12, T-15.
- **Archivos:** `backend/src/modules/countries/*`, `app.ts` y `backend/test/api/countries.test.ts`.
- **Criterios:** CA-82; `?foo=1` → 422 `UNKNOWN_FIELD` (CA-77 aplicado a este endpoint); `POST /countries` → 405.
- **Tests:** API.
- **Fuera de alcance:** nombres de país (los pone el frontend con `Intl.DisplayNames`).

### T-17 · Schema de alta de cliente [3–4 h]
- **Objetivo:** `buildCreateCustomerSchema(paísesSoportados)`, que encadena por campo normalización → formato → (checksum si `ES`), corta en el primer fallo de cada campo y ejecuta el checksum aunque fallen otros campos.
- **Referencias:** RF-01 a RF-06, RF-08, RF-09, spec 3.1, 3.3, architecture §2 (fábrica de schema) y §5.
- **Depende de:** T-08, T-09, T-14, T-16.
- **Archivos:** `backend/src/modules/customers/customers.schemas.ts` y su test.
- **Criterios:**
  - Rechazos de CA-39, CA-40, CA-41, CA-44, CA-45, CA-46, CA-48 y CA-49.
  - Rechazos de CA-52, CA-56, CA-58, CA-60, CA-61, CA-62, CA-64 y CA-65.
  - CA-110 (dos errores acumulados).
  - El país se valida contra la lista recibida; `" gb "` → `GB`.
- **Tests:** unitarios del schema pasando por `validate` (y, por tanto, por el traductor).
- **Fuera de alcance:** persistencia, 409 y ruta.

### T-18 · `POST /customers`: repositorio, service y ruta [3–4 h]
- **Objetivo:** persistir el cliente con `company_name_search`, traducir `SQLITE_CONSTRAINT_UNIQUE` en `DuplicateError` (409 `taxId`/`DUPLICATE`), responder 201 con `Location`, y montar la ruta con 415, 400, 413 y 405.
- **Referencias:** RF-01, RF-07, RF-10, RB-12, spec 4.4, 5.3, architecture §5 (409 sin SELECT previo).
- **Depende de:** T-17.
- **Archivos:** en `backend/src/modules/customers/`: `customers.repository.ts`, `customers.service.ts`, `customers.controller.ts`, `customers.routes.ts`. Además, `app.ts`, `backend/test/helpers/` (factoría de clientes) y `backend/test/api/customers.create.test.ts`.
- **Criterios:**
  - Altas: CA-38, CA-42, CA-43, CA-47, CA-50, CA-51, CA-53, CA-54, CA-55, CA-57, CA-59, CA-63, CA-66, CA-67 y CA-68.
  - CA-110 a través de la API, y una muestra de cada 422 de T-17 de extremo a extremo.
  - CA-83, CA-84 y CA-85 sobre esta ruta.
- **Tests:** API.
- **Fuera de alcance:** GET de clientes y seed demo.

### T-19 · `GET /customers/:id` [1–2 h]
- **Objetivo:** detalle de cliente con 404 y 422, y 405 para el resto de métodos sobre `/customers/:id`.
- **Referencias:** RF-10, RF-16, spec 5.5.
- **Depende de:** T-18.
- **Archivos:** archivos del módulo `customers` (añadir `findById`) y `backend/test/api/customers.detail.test.ts`.
- **Criterios:** CA-78, CA-79 y CA-86; la respuesta no expone `company_name_search`.
- **Tests:** API.
- **Fuera de alcance:** búsqueda e historial.

### T-20 · `GET /customers`: búsqueda y paginación [3–4 h]
- **Objetivo:** búsqueda OR por clave de nombre e identificador normalizado, con escapado de `\ % _` y `LIKE ? ESCAPE '\'`, rama de identificador omitida si normaliza a vacío, orden `company_name_search, id`, paginación con `total` y schema de `search`.
- **Referencias:** RF-11 a RF-15, RF-28, RB-13, spec 3.5, 5.2 (`Page`), 5.4.
- **Depende de:** T-19.
- **Archivos:** archivos del módulo `customers` y `backend/test/api/customers.search.test.ts`.
- **Criterios:** CA-69 a CA-77, CA-106, CA-107 y CA-109; `search=-` busca solo por nombre.
- **Tests:** API.
- **Fuera de alcance:** frontend.

### T-21 · `POST /simulations/preview` y cálculo compartido [3–4 h]
- **Objetivo:** schema de simulación, service `quote(input)` dentro de una transacción síncrona (cliente → tasa → `calculateQuote`) reutilizable por el guardado, y ruta de preview que responde 200 sin persistir.
- **Referencias:** RF-19 a RF-24 (cálculo), RF-26, RB-04, RB-06, RB-10, spec 3.4, 5.9, architecture §4, ADR-004.
- **Depende de:** T-06, T-18, T-16.
- **Archivos:** en `backend/src/modules/simulations/`: `simulations.schemas.ts`, `simulations.service.ts`, `simulations.controller.ts`, `simulations.routes.ts`. Además, `app.ts` y `backend/test/api/simulations.preview.test.ts`.
- **Criterios:**
  - CA-01 a CA-18 (CA-18 cambiando la tasa con `db` desde `createTestApp`).
  - CA-20, CA-24 (en el preview) y CA-28 a CA-37.
  - CA-83, CA-84 y CA-85 sobre esta ruta.
- **Tests:** API.
- **Fuera de alcance:** persistencia, historial y CA-19.

### T-22 · `POST /simulations` [2–3 h]
- **Objetivo:** repositorio de simulaciones (`insert` con `tiers_json` y `RETURNING`, mapeo de fila a entidad) y ruta que reutiliza `quote` y responde 201 sin `Location`.
- **Referencias:** RF-18, RF-24, RF-25, RB-09, RB-10, spec 4.5, 5.8.
- **Depende de:** T-21.
- **Archivos:** `backend/src/modules/simulations/simulations.repository.ts`, archivos del módulo, `app.ts` y `backend/test/api/simulations.create.test.ts`.
- **Criterios:** CA-21, CA-22, CA-24 (en el guardado), CA-25 y CA-89 (repositorio que falla, inyectado con `createApp(deps)`).
- **Tests:** API.
- **Fuera de alcance:** historial.

### T-23 · `GET /customers/:id/simulations` [2–3 h]
- **Objetivo:** historial paginado (`created_at DESC, id DESC`) que devuelve `tiers` guardados sin recalcular y responde 404 si el cliente no existe. Lo sirve el controller de `simulations`, montado bajo `/customers`.
- **Referencias:** RF-27, RF-28, RB-09, RB-11, spec 5.6.
- **Depende de:** T-22.
- **Archivos:** archivos del módulo `simulations`, `app.ts` y `backend/test/api/simulations.history.test.ts`.
- **Criterios:** CA-19, CA-23, CA-80 y CA-81; paginación (`pageSize`, página más allá del final); 422 con `id` inválido.
- **Tests:** API.
- **Fuera de alcance:** frontend.

---

## M4 · Frontend

### T-24 · Shell de la aplicación [3 h]
- **Objetivo:** providers (QueryClient con `retry: false` y `refetchOnWindowFocus: false`, Router), layout con cabecera y pie, `global.css` con variables, páginas vacías con sus rutas, y componentes compartidos de carga, error con reintento, vacío y paginación.
- **Referencias:** RF-43 (estados por vista), ADR-005, architecture §3.
- **Depende de:** T-04 (y M3 terminado, según tu orden).
- **Archivos:** `frontend/src/main.tsx`, `frontend/src/app/*`, `frontend/src/pages/*` (placeholders), `frontend/src/shared/*`, `frontend/src/global.css` y `frontend/.env.example`.
- **Dependencias a aprobar:** react-router, @tanstack/react-query.
- **Criterios:** las tres rutas renderizan; el botón de reintento del estado de error llama a su callback.
- **Tests:** componentes compartidos y router.
- **Fuera de alcance:** llamadas HTTP y divisa.

### T-25 · Cliente HTTP y capa `api/` [2–3 h]
- **Objetivo:** cliente con `VITE_API_URL + /api`, `signal`, interpretación del formato 5.1 → `ApiError { status, code, details }`, funciones y tipos por recurso, y query keys.
- **Referencias:** RF-30 (consumo), spec 5.2–5.9, architecture §3.
- **Depende de:** T-24.
- **Archivos:** `frontend/src/api/*` y sus tests.
- **Criterios:** un 422 produce un `ApiError` con `details`; un error de red o una respuesta no JSON produce un error genérico; la cancelación se propaga.
- **Tests:** unitarios con `fetch` simulado.
- **Fuera de alcance:** hooks de TanStack (van en cada feature) y API de tipos de cambio.

### T-26 · Conversión de divisa, `<Money>` y `<MoneyTotal>` (TDD) [3 h]
- **Objetivo:** `convert(cents, rate, currency)` con big.js `roundHalfUp` y decimales según `Intl.NumberFormat`, formato `es-ES`, y componentes `<Money cents>` y `<MoneyTotal baseCents taxCents>` (suma de redondeados).
- **Referencias:** RF-42, RB-14, RB-15, ADR-006.
- **Depende de:** T-24.
- **Archivos:** `frontend/src/features/currency/conversion.ts`, `Money.tsx`, `MoneyTotal.tsx` y sus tests.
- **Dependencias a aprobar:** big.js y @types/big.js.
- **Criterios:**
  - CA-97 (JPY: 22.732 + 4774 = 27.506).
  - CA-98 (USD: 183,80).
  - La fila GBP de RB-15.
  - `1.005` redondea bien.
  - Los tests comparan contra la salida de `Intl.NumberFormat('es-ES')`, no contra literales.
- **Tests:** unitarios y de componente (con tipos pasados por props o con un contexto de prueba).
- **Fuera de alcance:** obtención de tipos y selector.

### T-27 · Cliente de tipos de cambio y `useFxRates` [2–3 h]
- **Objetivo:** fetch a `VITE_FX_URL` con `AbortSignal.timeout(5000)`, validación zod (`result`, cuatro divisas finitas > 0), `staleTime` desde `time_next_update_unix` y `gcTime: Infinity`.
- **Referencias:** RF-41, RF-43 (timeout y conservar caché), ADR-005.
- **Depende de:** T-24.
- **Archivos:** `frontend/src/features/currency/fxClient.ts`, `useFxRates.ts` y sus tests.
- **Dependencias a aprobar:** zod@4 en el frontend.
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
- **Depende de:** T-26, T-27.
- **Archivos:** `frontend/src/features/currency/CurrencyContext.tsx`, `CurrencySelector.tsx`, `useCurrency.ts`, el layout de `app/` y sus tests.
- **Criterios:**
  - CA-100, CA-101, CA-102 y CA-104.
  - CA-99 a nivel de contexto: la divisa persiste entre dos rutas de prueba.
  - Un `localStorage` que lanza error no rompe la aplicación.
- **Tests:** componente con `fetch` simulado.
- **Fuera de alcance:** pintar importes en las páginas.

### T-29 · Dashboard: buscador y listado [3–4 h]
- **Objetivo:** `useDebouncedValue` (300 ms), `useCustomerSearch`, buscador que vuelve a la página 1 en cada cambio, listado paginado de tarjetas con enlace al detalle y botón de alta. Sin KPIs.
- **Referencias:** RF-34, RF-43 (estados), RF-44.
- **Depende de:** T-25, T-28.
- **Archivos:** `frontend/src/shared/useDebouncedValue.ts`, `frontend/src/features/customers/` (buscador, listado, tarjeta), `frontend/src/pages/Dashboard.tsx` y sus tests.
- **Criterios:** CA-90; CA-105 en el listado; debounce verificado con timers falsos; estados de carga, error con reintento y vacío.
- **Tests:** hook y componentes.
- **Fuera de alcance:** formulario y detalle.

### T-30 · Formulario de alta de cliente [3–4 h]
- **Objetivo:** formulario con `useCountries` y `Intl.DisplayNames`, enum de planes, validación local (obligatorios y longitudes tras trim y colapso), `useCreateCustomer` y errores de `details[]` junto a cada campo, incluido el 409.
- **Referencias:** RF-36, RF-37, spec 3.7.
- **Depende de:** T-29.
- **Archivos:** `frontend/src/features/customers/` (formulario, enum de planes, hooks), `frontend/src/pages/NewCustomer.tsx` y sus tests.
- **Criterios:** CA-94, CA-95 y CA-96; el algoritmo del identificador no se ejecuta en el cliente.
- **Tests:** componente con `fetch` simulado.
- **Fuera de alcance:** lo que pasa tras el alta (ver la pregunta abierta 1).

### T-31 · Detalle del cliente e historial [3–4 h]
- **Objetivo:** tarjeta de datos del cliente, historial paginado con fecha, usuarios, GB, llamadas, base, impuesto, total y tasa, desplegable de tramos con importes convertidos y diseño responsive.
- **Referencias:** RF-35, RF-40 (aplicación a historial y tarjetas), RF-43, RF-44, RB-14 (tramos).
- **Depende de:** T-29.
- **Archivos:** `frontend/src/features/simulation/` (historial, desglose de tramos), `frontend/src/pages/CustomerDetail.tsx`, CSS Modules y sus tests.
- **Criterios:** CA-105 en el detalle; CA-99 navegando de dashboard a detalle en USD; CA-91 verificado a mano (360 px y escritorio); 404 de cliente con su estado.
- **Tests:** componentes.
- **Fuera de alcance:** simulador.

### T-32 · Simulador con preview en tiempo real [3–4 h]
- **Objetivo:** slider de 1–500 y controles de GB y llamadas dentro de los rangos de 3.4, `usePreview` (key con valores debounced a 250 ms, `signal`, última proyección válida conservada con aviso) y proyección con base, impuesto, total y tramos.
- **Referencias:** RF-38, RF-43 (fallo del preview), spec 1.7 (slider frente a API), 3.7, ADR-005.
- **Depende de:** T-31.
- **Archivos:** `frontend/src/features/simulation/` (simulador, proyección, `usePreview`) y sus tests.
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
- **Objetivo:** `npm run db:seed:demo`, que crea clientes de ejemplo (y alguna simulación) a través de los services, nunca con SQL directo, para que pasen la normalización.
- **Referencias:** architecture §1 (`db/`), ADR-003.
- **Depende de:** T-22.
- **Archivos:** `backend/src/db/seedDemo.ts` y el script en `package.json`.
- **Criterios:** es idempotente o avisa si ya hay datos; `createTestApp` nunca lo ejecuta.
- **Tests:** un test que ejecuta el seed sobre `:memory:` y comprueba que los datos pasan la validación.
- **Fuera de alcance:** el seed de tasas.

### T-35 · README [1–2 h]
- **Objetivo:** qué es, requisitos (Node 22), arranque en pocos pasos, scripts, variables de entorno y limitaciones documentadas (spec 1.7).
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
   - Reglas de capas en ESLint (T-03).
   - CORS, 404 y 500 (T-10).
   - Pipeline 415/413/400/405 (T-13).
   - Schemas comunes (T-15).
   - `createTestApp` (T-10/T-11).
   - Componentes de estado compartidos (T-24).
   - Pie de atribución de open.er-api (T-28).
4. **El seed demo podría ir antes de M4.** Solo depende de T-22, y tener datos reales ayuda a desarrollar y probar el frontend a mano. Propongo moverlo justo después de T-23.
5. **La divisa no depende de la API.** T-26 y T-27 podrían hacerse en paralelo con M3. Los mantengo en M4 por tu criterio de «frontend cuando la API esté terminada».
6. **Riesgo de Express 5 y zod 4** (*Pendiente de verificar* de architecture). Queda fijado pronto, en T-13 y T-14. Si algo no se comporta como se espera, se corrige ahí antes de que lo usen los endpoints.
7. **CA fuera del rango CA-01–CA-107 y el hueco de CA-108.** La spec también tiene CA-109 (de R-69) y CA-110 (de R-70), que incluyo en la matriz. Ninguna revisión crea un CA-108: lo trato como un error de rango en R-78, que debería decir «CA-109 y CA-110». No invento un CA nuevo, porque manda la spec. Lo que sí faltaba es cobertura para R-71 (migrar y cargar las tasas al arrancar), aplicada en la v1.1 sin CA. La cubro con un test sin CA en T-11. Si prefieres que tenga un CA formal, añádelo a la spec y lo enlazo.

### Respuestas a tus dudas
- **¿El traductor de zod va con el middleware de errores?** No. Es la pieza más delicada (architecture §5) y la que fija los puntos sin verificar de zod 4. El `errorHandler` va en T-10 y el traductor con `validate` en T-14.
- **¿Separar el alta de cliente en dos tareas?** Sí: T-17 para el schema (normalización, checksum cruzado, CA-110) y T-18 para persistencia, 409 y ruta. T-17 se integra sola porque sus tests pasan por `validate`.
- **¿La conversión de divisa necesita una tarea propia con TDD?** Sí, T-26. Es lógica de dinero con casos frágiles (`1.005`, JPY sin decimales, total como suma) y tiene CA exactos (97 y 98). CLAUDE.md solo exige TDD en `domain/`, pero propongo aplicar el mismo flujo aquí: primero los tests y luego tu OK.

### Preguntas abiertas (resolver antes de la tarea indicada)
1. **(T-30) Tras un alta correcta, ¿qué hace el frontend?** Por ejemplo, navegar al detalle del nuevo cliente o volver al dashboard. La spec no lo dice.
2. **(T-29) ¿La tarjeta del listado enlaza al detalle?** Se deduce de la navegación de CA-99, pero no está escrito. ¿Qué campos muestra?

---

## Matriz de cobertura

Primero la tarea principal; entre paréntesis, las que lo cubren también a otro nivel (unidad o schema).

| CA | Tarea | CA | Tarea | CA | Tarea |
|---|---|---|---|---|---|
| 01–08 | T-21 (T-05) | 39–41 | T-17 (T-09) | 75 | T-20 (T-15) |
| 09–10 | T-21 | 42 | T-18 (T-09) | 76 | T-20 |
| 11 | T-21 | 43 | T-18 (T-09) | 77 | T-20 (T-16) |
| 12 | T-21 (T-05) | 44 | T-17 | 78 | T-19 |
| 13–17 | T-21 (T-06) | 45 | T-17 (T-09) | 79 | T-19 (T-15) |
| 18 | T-21 (T-06) | 46 | T-17 | 80–81 | T-23 |
| 19 | T-23 | 47 | T-18 (T-17) | 82 | T-16 |
| 20 | T-21 | 48–49 | T-17 | 83–85 | T-18, T-21 (T-13) |
| 21–22 | T-22 | 50–51 | T-18 (T-07) | 86 | T-19 (T-13) |
| 23 | T-23 | 52 | T-17 (T-07) | 87 | T-10 |
| 24 | T-21, T-22 | 53–54 | T-18 (T-07) | 88 | T-10 y todas las de API |
| 25 | T-22 | 55, 57, 59 | T-18 (T-08) | 89 | T-22 (T-10) |
| 26–27 | T-12 | 56, 58 | T-17 (T-08) | 90 | T-29 |
| 28–37 | T-21 (T-14) | 60–62 | T-17 (T-07) | 91 | T-31, **manual** (T-36) |
| 38 | T-18 | 63 | T-18 (T-09) | 92 | T-32 |
| | | 64–65 | T-17 (T-09) | 93 | T-33 |
| | | 66–68 | T-18 | 94–96 | T-30 |
| | | 69–71 | T-20 (T-09) | 97–98 | T-26 |
| | | 72–74 | T-20 | 99 | T-31 (T-28) |
| | | | | 100–102 | T-28 |
| | | | | 103 | T-27 |
| | | | | 104 | T-28 |
| | | | | 105 | T-29, T-31 |
| | | | | 106–107 | T-20 |
| | | | | 109 | T-20 (T-14) |
| | | | | 110 | T-17, T-18 |

**CA sin tarea:** ninguno. **CA sin test automático:** CA-91 (verificación manual en T-31 y registrada en T-36). **CA inexistente:** CA-108 (error de rango en R-78; ver la observación 7).

---

## Verificación del plan
- Cada tarea termina con lint, typecheck y test en verde en local y en CI (desde T-04).
- Los nombres de los tests llevan su CA; T-36 comprueba de forma automática que no queda ningún CA sin test.
- Revisión manual final: arranque desde un clon limpio con el README y recorrido de CA-91 en 360 px y en escritorio.
