# 04- Especificación inicial

## 1.Prompt inicial
Actúa como arquitecto de software senior. Fase de arquitectura de SaaS-O-Matic. No escribas código de la aplicación. Te adjunto la especificación v1.0 y mis decisiones iniciales (A-01 a A-37).
Necesito que propongas:

1. Estructura de carpetas completa de backend y frontend, con una línea por carpeta indicando su responsabilidad.
2. Capas del backend y reglas de dependencia: qué puede importar cada capa y qué no.
3. Organización del frontend: features, capa de API, estado global y hooks.
4. Flujo de `POST /simulations` de principio a fin a través de las capas, incluyendo dónde se valida, normaliza, calcula, persiste y mapea.
5. Estrategia de errores: cómo un error de dominio o de BD acaba en el formato de error de la sección 5.1.
6. Estrategia de tests: qué se testea en cada capa y con qué herramienta, y cómo se enlazan con los CA-XX.
7. Lista de ADRs recomendados.

Si alguna decisión mía te parece mala o choca con la spec, dilo explícitamente y razona por qué.
No inventes requisitos que no estén en la spec. Sé conciso.

## 2.Respuesta IA

Las 37 decisiones son compatibles con la spec salvo cinco puntos, que van primero porque condicionan el resto.

## 0. Objeciones a las decisiones iniciales
 
### 0.1 Conflictos con la spec o entre decisiones
 
| Decisión | Problema | Propuesta |
|---|---|---|
| **A-26** (debounce con TanStack Query) | TanStack Query no hace debounce, solo cancelación. Además choca con A-32, que testea "el hook de debounce". | Hook propio `useDebouncedValue` (sirve para RF-34 y RF-38). La query usa el valor ya debounced como key y pasa su `signal` a `fetch`, lo que cumple "un AbortController por petición, solo se pinta la última". |
| **A-23** (motivo: "el reintento") | Por defecto reintenta 3 veces automáticamente. RF-43 exige que el reintento sea siempre manual. | `retry: false` global y `refetchOnWindowFocus: false`; el botón llama a `refetch()`. |
| **A-10** (middleware genérico zod) | `country` se valida contra `tax_rates` (paso 4 de 3.1) dentro de la misma fase que acumula errores en un único 422. Un schema estático no puede hacerlo, y validarlo después en el service rompería la acumulación. | El middleware sigue siendo genérico, pero acepta una fábrica de schema: `buildCreateCustomerSchema(paísesSoportados)`, con los países leídos por petición (la tabla se edita a mano, no se cachea). |
| **A-17 + A-20** (migrar al arrancar, seed demo) | Si al arrancar solo se migra, `tax_rates` queda vacía y la app no funciona "sin pasos manuales". Si el seed demo se mezcla con el de tasas, contamina los tests (CA-72 asume 25 clientes exactos). | Al arrancar: migraciones más seed de tasas (`INSERT OR IGNORE`, como en 4.7). Clientes demo en un comando aparte (`db:seed:demo`), insertados a través del service para que pasen la normalización y el checksum. Nunca en tests. |
| **A-32** (no cubrir toda la UI) | Con E2E descartado (6.10), algunos CA de 6.9 quedan sin test automático. CA-91 (responsive a 360 px) no es verificable en jsdom. | Aceptable, pero hay que declararlo: una matriz de trazabilidad que marque esos CA como "verificación manual". |
 
### 0.2 Matices menores
 
- **A-09:** la validación no aparece en la cadena de capas. Va en un middleware entre la ruta y el controller.
- **A-18:** hay dos mapeos distintos. Fila a entidad en el repositorio (incluye parsear `tiers_json`), y entidad a respuesta en el controller (añade `currency: "EUR"`, oculta `company_name_search`).
- **A-35:** Vitest no comprueba tipos. Hay que añadir `tsc --noEmit` al CI o `strict: true` (A-04) no se verifica.
---
 
## 1. Estructura de carpetas
 
```
saas-o-matic/
├── package.json              # workspaces; scripts dev, lint, typecheck, test, db:*
├── .nvmrc                    # Node 22 (RNF-01)
├── eslint.config.js          # reglas de capas (sección 2)
├── .github/workflows/ci.yml  # lint + typecheck + test
├── docs/adr/                 # ADRs numerados
├── backend/
│   ├── .env.example          # PORT, HOST, DB_PATH, CORS_ORIGIN
│   ├── migrations/           # SQL numerado: 001_init.sql…
│   ├── src/
│   │   ├── server.ts         # arranque: config → db → migrar + seed de tasas → listen
│   │   ├── app.ts            # createApp({ db }): composición manual y orden de middlewares
│   │   ├── config/           # env validado con zod y valores por defecto
│   │   ├── db/               # conexión (PRAGMA foreign_keys), runner de migraciones, seeds
│   │   ├── http/             # middlewares transversales: content-type, body JSON, validate,
│   │   │                     #   405, 404, errorHandler y traductor de issues de zod
│   │   ├── shared/           # errores tipados, logger, tipos de paginación
│   │   └── modules/
│   │       ├── customers/    # routes, controller, service, repository, schemas
│   │       │   └── domain/   # companyName, taxId (3.6), clave de búsqueda: puro
│   │       ├── simulations/  # routes, controller, service, repository, schemas
│   │       │   └── domain/   # pricing (tramos), money (half-up): puro
│   │       └── countries/    # routes, controller, repository de tax_rates
│   └── test/
│       ├── api/              # integración Supertest + :memory:
│       ├── db/               # triggers y CHECK directos (CA-26, CA-27)
│       └── helpers/          # createTestApp, factorías de clientes
└── frontend/
    ├── .env.example          # VITE_API_URL, VITE_FX_URL
    └── src/
        ├── main.tsx          # providers: QueryClient, Currency, Router
        ├── app/              # router, queryClient, layout (cabecera con selector, pie con atribución)
        ├── pages/            # Dashboard, CustomerDetail, NewCustomer: componen features
        ├── api/              # cliente HTTP, ApiError, funciones por recurso, tipos, query keys
        ├── features/
        │   ├── customers/    # buscador, listado, tarjeta, formulario de alta, enum de planes
        │   ├── simulation/   # simulador, proyección, historial, desglose de tramos
        │   └── currency/     # contexto, selector, cliente FX (zod), conversión (big.js), <Money>
        ├── shared/           # useDebouncedValue, paginación, estados carga/error/vacío
        └── test/             # setup de Testing Library
```
 
Los tests unitarios de dominio van junto al archivo (`pricing.test.ts`).
 
---
 
## 2. Capas del backend y dependencias
 
| Capa | Puede importar | No puede importar |
|---|---|---|
| `domain/` | Nada, solo TypeScript | express, zod, better-sqlite3, cualquier otra capa |
| `schemas` | zod, `domain/` (normalizadores y validadores) | repository, service, express |
| `repository` | `db/`, tipos de entidad, `shared/errors` | service, controller, express |
| `service` | `domain/`, interfaces de repositorio (del propio módulo o de otro), `shared/errors` | express, better-sqlite3, zod, controller |
| `controller` | service, tipos de express | repository, `db/`, `domain/` |
| `routes` | controller, `http/validate`, schemas | service, repository |
| `http/` | `shared/`, express, zod | `modules/*` |
| `app.ts` | Todo: es el único punto de composición | — |
 
Cuatro reglas completan la tabla:
 
- **Dominio:** no lanza errores HTTP. Devuelve resultados; por ejemplo, `validateSpanishTaxId` devuelve `OK`, `INVALID_FORMAT` o `INVALID_CHECKSUM`.
- **Entre módulos:** solo por inyección de repositorios en el service. `simulations.service` recibe el repositorio de clientes y el de tasas.
- **Historial:** `GET /customers/:id/simulations` lo sirve el controller de `simulations`, montado bajo la ruta de clientes.
- **ESLint:** los sufijos de archivo (`*.service.ts`, `*.repository.ts`…) permiten imponer la tabla con `no-restricted-imports` por glob, sin plugin adicional.
---
 
## 3. Organización del frontend
 
- **Capa de API (`api/`):** un cliente que añade `VITE_API_URL + /api`, acepta `signal`, interpreta el formato 5.1 y lanza `ApiError { status, code, details }`. Es el único sitio con `fetch` al backend. El cliente de tipos de cambio vive en `features/currency` porque es otra API, con validación zod y timeout de 5 s.
- **Estado de servidor:** TanStack Query, con hooks por feature (`useCustomerSearch`, `useCustomer`, `useSimulationHistory`, `useCountries`, `usePreview`, `useFxRates`). Las mutaciones son `useCreateCustomer` y `useSaveSimulation`.
- **Preview (RF-38):** es una query cuya key son los valores debounced a 250 ms. `keepPreviousData` no cubre el caso de error, así que el hook guarda la última proyección válida para cumplir "se mantiene con aviso".
- **Guardado (RF-39):** el botón se deshabilita con `isPending`. Al terminar se invalida el historial y se vuelve a la página 1; el formulario no se resetea.
- **Tipos de cambio (RF-41, RF-43):** `staleTime` calculado desde `time_next_update_unix` y `gcTime: Infinity`. Si falla un refresco, TanStack conserva los datos anteriores, que es lo que pide la spec.
- **Estado global:** el contexto guarda solo la divisa elegida y su persistencia en `localStorage`. La divisa efectiva se deriva: si no hay tipos, EUR, sin sobrescribir la elección guardada.
- **Importes:** todos se pintan con `<Money cents>`, único punto de conversión y formato (RB-14, `es-ES`).
- **Dependencias:** `pages` importa features; las features importan `api/` y `shared/`. Las features no se importan entre sí, salvo la superficie pública de `currency` (`<Money>`, `useCurrency`).
---
 
## 4. Flujo de `POST /api/simulations`
 
| # | Capa | Qué ocurre | Fallo posible |
|---|---|---|---|
| 1 | `cors` | Se monta el primero, para que el preflight responda 204. | — |
| 2 | `http/` Content-Type | Comprueba `application/json` antes de parsear. | 415 |
| 3 | `express.json({ limit: '10kb' })` | Parseo del body. Un body vacío no produce error por sí solo: necesita una comprobación explícita. | 413 / 400 |
| 4 | `validate(simulationSchema)` | **Valida:** objeto estricto, enteros y rangos, acumulando todos los errores. **No normaliza:** no hay strings; `10.0` ya llega como `10`. | 422 |
| 5 | Controller | Pasa el input tipado al service. Sin lógica. | — |
| 6 | Service (transacción síncrona) | Busca el cliente (`customersRepo.findById`), lee la tasa de su país (`taxRatesRepo.getRateBp`) y **calcula** con `domain.calculateQuote(users, rateBp)` → base, impuesto, total y tramos. | 404 |
| 7 | Repositorio | **Persiste:** `simulationsRepo.insert` serializa `tiers_json`; la BD genera `id` y `created_at` (`RETURNING`). **Mapea** fila → entidad. | 500 |
| 8 | Controller | **Mapea** entidad → respuesta, añade `currency: "EUR"`, responde 201 sin `Location`. | — |
 
`/preview` comparte los pasos 1 a 6 con la misma función del service, omite el 7 y responde 200. Esa función única es lo que garantiza RB-10.
 
---
 
## 5. Estrategia de errores
 
Una jerarquía `AppError` en `shared/errors` y un único `errorHandler` al final de `app.ts` que serializa al formato 5.1.
 
| Origen | Cómo se produce | Resultado |
|---|---|---|
| zod | `validate` traduce los issues a `details[]` | 422 `VALIDATION_ERROR` |
| Dominio | Devuelve un código que el schema convierte en issue; nunca lanza | 422 |
| Service | `NotFoundError` | 404, `details: []` |
| BD, violación de UNIQUE | El repositorio captura `SQLITE_CONSTRAINT_UNIQUE` y lanza `DuplicateError`, sin SELECT previo, para cubrir la carrera (4.4) | 409, `taxId` / `DUPLICATE` |
| BD, resto (CHECK, trigger, FK) | Es un bug: se propaga sin traducir | 500 genérico; la traza va solo al logger |
| body-parser | El handler mapea `entity.parse.failed` y `entity.too.large` | 400 / 413 |
| Ruta o método | `.all()` por ruta para el 405; fallback final para el 404 | 405 / 404 |
 
### Traductor de issues de zod
 
Es la pieza más delicada:
 
- Ausente o `null` → `REQUIRED`; otro tipo → `INVALID_TYPE`.
- Claves desconocidas → un `UNKNOWN_FIELD` por clave.
- Límite numérico → `OUT_OF_RANGE`; límite de longitud → `INVALID_LENGTH`.
- Body que no es objeto → `field: "body"`.
- "Un campo que falla en un paso no se evalúa en los siguientes" obliga a encadenar normalización, formato y checksum por campo, cortando en el primer fallo.
---
 
## 6. Estrategia de tests
 
| Capa | Herramienta | Qué cubre | CA |
|---|---|---|---|
| Dominio | Vitest, TDD | Tramos y límites, propiedad Σ subtotales = base para 1..1000, half-up, tabla 3.6.7, normalizadores | 01–08, 12, 18, 50–62 |
| API | Supertest + `:memory:` | Contrato completo: validación, códigos, paginación, búsqueda, snapshot | 09–11, 13–25, 28–89, 106–107 |
| BD | better-sqlite3 directo | Triggers de inmutabilidad y CHECK | 26, 27 |
| Frontend, lógica | Vitest | Conversión con big.js, `useDebouncedValue` con timers falsos | 97, 98 |
| Frontend, componentes | Testing Library con `fetch` simulado | Errores por campo, simulador, divisa y sus estados, escapado | 90, 92–96, 99–105 |
| Manual | — | Responsive | 91 |
 
- **Inyección:** `createTestApp()` crea la BD, aplica migraciones y seed de tasas, y expone `db`. Hace falta para CA-18 y CA-19 (cambiar la tasa) y para CA-89 (inyectar un repositorio que falla).
- **Trazabilidad:** el nombre del test empieza por su ID (`CA-04: 15 usuarios → 14 000`). Un CA puede aparecer en dominio y en API.
- **Opcional:** un script en CI que extraiga los `CA-\d+` de los tests y los compare con la spec, para listar los no cubiertos.
---
 
## 7. ADRs recomendados
 
| # | ADR | Decisiones relacionadas |
|---|---|---|
| 1 | Monorepo con npm workspaces, sin paquete compartido | A-01, A-06 |
| 2 | Express y su versión (la 5 trae el parser de query `simple` por defecto, pero `req.query` es de solo lectura: lo validado va a `res.locals`) | A-07 |
| 3 | Módulos por funcionalidad, capas internas y reglas de importación impuestas con ESLint | A-05, A-08, A-09 |
| 4 | Validación: middleware genérico con fábrica de schema, dominio sin zod y traducción de issues | A-10 *(corrige)* |
| 5 | Errores tipados con handler central; qué errores de BD se traducen y cuáles son 500 | A-11 |
| 6 | better-sqlite3 con SQL a mano, migraciones numeradas, migración y seed de tasas al arrancar, seed demo aparte | A-15, A-16, A-17, A-20 *(corrige)* |
| 7 | Inyección manual con `createApp(deps)` y separación app/server | A-12, A-13 |
| 8 | Dinero en céntimos enteros, tasas en puntos básicos, half-up entero | Spec 2.2 |
| 9 | Snapshot de tasa y tramos, e inmutabilidad por triggers | Spec RB-09, 4.5 |
| 10 | Una sola función de cálculo para preview y guardado, dentro de una transacción | Spec RB-10 |
| 11 | TanStack Query para estado de servidor: sin reintentos automáticos, preview como query, debounce propio | A-23, A-26 *(corrige)* |
| 12 | Divisa: Context para la elección, conversión solo en frontend con big.js, total como suma de redondeados | A-24, Spec RB-14 |
| 13 | CORS directo sin proxy de Vite | A-30 |
| 14 | Pirámide de tests sin E2E, trazabilidad CA-XX y CA de verificación manual | A-31 a A-34 |
 
Los ADR 4, 6 y 11 recogen las correcciones de la sección 0, así que conviene anotarlas antes en el review-log (Fase 2).
 
---
 
## Pendiente de verificar
 
No está contrastado contra documentación el comportamiento exacto de Express 5 y zod 4 en los puntos citados. Lo fijarán estos tests en cuanto existan:
 
| Punto | Test que lo fija |
|---|---|
| Código de issue de zod 4 para un decimal en un campo entero | CA-29 |
| Body vacío con `express.json` | CA-84 |
| Parser de query y parámetros no enteros | CA-75 |