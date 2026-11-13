# SaaS-O-Matic — Propuesta de arquitectura

## 1. Estructura de carpetas

```
saas-o-matic/
├── README.md                 # qué es y cómo arrancarlo en pocos pasos
├── package.json              # workspaces; engines (Node 22, RNF-01); scripts dev, lint, typecheck, test, db:*
├── .nvmrc                    # Node 22 (RNF-01)
├── eslint.config.js          # reglas de capas (sección 2)
├── .github/workflows/ci.yml  # lint + typecheck + test
├── ai-workspace/             # trabajo con la IA: spec, decisiones, prompts y review-log
├── docs/adr/                 # ADRs numerados
├── backend/
│   ├── .env.example          # PORT, HOST, DB_PATH, CORS_ORIGIN
│   ├── migrations/           # SQL numerado: 001_init.sql…
│   ├── src/
│   │   ├── server.ts         # arranque: config → db → migrar + seed de tasas → listen
│   │   ├── app.ts            # createApp(deps): composición manual con dependencias sustituibles y orden de middlewares
│   │   ├── config/           # env validado con zod y valores por defecto
│   │   ├── db/               # conexión (PRAGMA foreign_keys), runner de migraciones, seed de tasas,
│   │   │                     #   seed demo aparte (db:seed:demo, a través del service)
│   │   ├── http/             # middlewares transversales: content-type, body JSON, validate,
│   │   │                     #   405, 404, errorHandler, traductor de issues de zod
│   │   │                     #   y schema de query vacío y estricto
│   │   ├── shared/           # errores tipados, logger, tipos de paginación
│   │   └── modules/
│   │       ├── customers/    # routes, controller, service, repository, schemas
│   │       │   └── domain/   # companyName, taxId (3.6), clave de búsqueda: puro
│   │       ├── simulations/  # routes, controller, service, repository, schemas
│   │       │   └── domain/   # pricing (tramos), money (half-up): puro
│   │       └── countries/    # routes, controller, service, repository de tax_rates
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
        │   └── currency/     # contexto, selector, cliente FX (zod), conversión (big.js), <Money>, <MoneyTotal>
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

Seis reglas completan la tabla:

- **Dominio:** no lanza errores HTTP. Devuelve resultados; por ejemplo, `validateSpanishTaxId` devuelve `OK`, `INVALID_FORMAT` o `INVALID_CHECKSUM`.
- **Entre módulos:** solo por inyección de repositorios en el service. `simulations.service` recibe el repositorio de clientes y el de tasas.
- **Historial:** `GET /customers/:id/simulations` lo sirve el controller de `simulations`, montado bajo la ruta de clientes.
- **ESLint:** los sufijos de archivo (`*.service.ts`, `*.repository.ts`…) permiten imponer la tabla con `no-restricted-imports` por glob, sin plugin adicional.
- **Schemas con datos de BD:** el middleware `validate` es genérico, pero acepta una fábrica de schema. `buildCreateCustomerSchema(paísesSoportados)` recibe los países leídos de `tax_rates` en cada petición (la tabla se edita a mano, no se cachea), de modo que `country` se valida en la misma fase que acumula el 422.
- **Query:** todas las rutas validan su query. Las que no admiten parámetros aplican el schema vacío y estricto de `http/`, que responde 422 `UNKNOWN_FIELD` (5.1).

---

## 3. Organización del frontend

- **Capa de API (`api/`):** un cliente que añade `VITE_API_URL + /api`, acepta `signal`, interpreta el formato 5.1 y lanza `ApiError { status, code, details }`. Es el único sitio con `fetch` al backend. El cliente de tipos de cambio vive en `features/currency` porque es otra API, con validación zod y timeout de 5 s.
- **Estado de servidor:** TanStack Query, con hooks por feature (`useCustomerSearch`, `useCustomer`, `useSimulationHistory`, `useCountries`, `usePreview`, `useFxRates`). Las mutaciones son `useCreateCustomer` y `useSaveSimulation`. Configuración global: `retry: false` y `refetchOnWindowFocus: false`; el reintento es siempre manual, con un botón que llama a `refetch()` (RF-43).
- **Debounce:** hook propio `useDebouncedValue`, usado por el buscador (RF-34, 300 ms) y por el preview (RF-38, 250 ms). TanStack Query aporta solo la cancelación.
- **Preview (RF-38):** es una query cuya key son los valores debounced a 250 ms y que pasa su `signal` a `fetch`. `keepPreviousData` no cubre el caso de error, así que el hook guarda la última proyección válida para cumplir "se mantiene con aviso".
- **Guardado (RF-39):** el botón se deshabilita con `isPending`. Al terminar se invalida el historial y se vuelve a la página 1; el formulario no se resetea.
- **Tipos de cambio (RF-41, RF-43):** `staleTime` calculado desde `time_next_update_unix` y `gcTime: Infinity`. Si falla un refresco, TanStack conserva los datos anteriores, que es lo que pide la spec.
- **Estado global:** el contexto guarda solo la divisa elegida y su persistencia en `localStorage`. La divisa efectiva se deriva: si no hay tipos, EUR, sin sobrescribir la elección guardada.
- **Importes:** los importes sueltos (base, impuesto, subtotales de tramo) se pintan con `<Money cents>`. El total se pinta con `<MoneyTotal baseCents taxCents>`, que suma los dos importes ya redondeados y nunca convierte el total directamente (RB-14, CA-97). Cada subtotal de tramo se convierte y redondea por separado, por lo que su suma puede diferir de la base convertida en una unidad mínima (RB-14). El formato es siempre `es-ES`.
- **Dependencias:** `pages` importa features; las features importan `api/` y `shared/`. Las features no se importan entre sí, salvo la superficie pública de `currency` (`<Money>`, `<MoneyTotal>`, `useCurrency`).

---

## 4. Flujo de `POST /api/simulations`

| # | Capa | Qué ocurre | Fallo posible |
|---|---|---|---|
| 1 | `cors` | Se monta el primero, para que el preflight responda 204. | — |
| 2 | `http/` Content-Type | Comprueba `application/json` antes de parsear. | 415 |
| 3 | `express.json({ limit: '10kb', strict: false })` | Parseo del body. Con `strict: false` el parser acepta cualquier valor JSON (`null`, `42`), que rechaza después el paso 4. Un body vacío no produce error por sí solo: necesita una comprobación explícita sobre el body crudo. | 413 / 400 |
| 4 | `validate(simulationSchema)` | **Valida:** query con el schema vacío y estricto; body como objeto estricto (si no es objeto, `field: "body"`), enteros y rangos, acumulando todos los errores. **No normaliza:** no hay strings; `10.0` ya llega como `10`. | 422 |
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
- Claves desconocidas → un `UNKNOWN_FIELD` por clave. Incluye la forma `search[]=`, que con el parser `simple` llega como la clave literal `search[]`.
- Parámetro de query repetido (llega como array) → `INVALID_TYPE`.
- Límite numérico → `OUT_OF_RANGE`; límite de longitud → `INVALID_LENGTH`.
- Valor fuera del conjunto permitido (`country`, `plan`) → `UNSUPPORTED_VALUE`.
- Formato de email no válido (`z.email()`) → `INVALID_FORMAT`.
- Body que no es objeto → `field: "body"`.
- **`:id` de ruta:** su schema es un string con `^[1-9][0-9]*$` y el máximo en un único refine que emite `INVALID_FORMAT` (3.5, CA-79). Así `GET /customers/0` no cae en la regla de límite numérico y el traductor no cambia.
- "Un campo que falla en un paso no se evalúa en los siguientes" obliga a encadenar normalización y formato por campo, cortando en el primer fallo.
- **Checksum del identificador:** depende de dos campos (`taxId` y `country`), así que no es una validación de un solo campo. Debe montarse de forma que se ejecute siempre que esos dos campos sean válidos, aunque otros campos hayan fallado, para no perder la acumulación de errores (CA-110).

---

## 6. Estrategia de tests

| Capa | Herramienta | Qué cubre | CA |
|---|---|---|---|
| Dominio | Vitest, TDD | Tramos y límites, propiedad Σ subtotales = base para 1..1000, half-up, tabla 3.6.7, normalizadores | 01–08, 12, 18, 50–62 |
| API | Supertest + `:memory:` | Contrato completo: tramos a través del preview, validación, códigos, paginación, búsqueda, snapshot | 01–11, 13–25, 28–89, 106–110 |
| BD | better-sqlite3 directo | Triggers de inmutabilidad y CHECK | 26, 27 |
| Frontend, lógica | Vitest | Conversión con big.js, `useDebouncedValue` con timers falsos | 97, 98 |
| Frontend, componentes | Testing Library con `fetch` simulado | Errores por campo, simulador, divisa y sus estados, escapado | 90, 92–96, 99–105 |
| Manual | — | Responsive | 91 |

- **Inyección:** `createTestApp()` crea la BD, aplica migraciones y seed de tasas (nunca el seed demo), y expone `db`. Acepta sustitutos de las dependencias de `createApp(deps)`. Hace falta para CA-18 y CA-19 (cambiar la tasa) y para CA-89 (inyectar un repositorio que falla).
- **Trazabilidad:** el nombre del test empieza por su ID (`CA-04: 15 usuarios → 14 000`). Un CA puede aparecer en dominio y en API.
- **Verificación manual:** los CA sin test automático (CA-91) se marcan como tales en la matriz de trazabilidad.
- **Opcional:** un script en CI que extraiga los `CA-\d+` de los tests y los compare con la spec, para listar los no cubiertos.

---

## 7. ADRs recomendados

| # | ADR | Decisiones relacionadas |
|---|---|---|
| 1 | Monorepo con npm workspaces, sin paquete compartido | A-01, A-06 |
| 2 | Express y su versión (la 5 trae el parser de query `simple` por defecto, pero `req.query` es de solo lectura: lo validado va a `res.locals`) | A-07 |
| 3 | Módulos por funcionalidad, capas internas y reglas de importación impuestas con ESLint | A-05, A-08, A-09 |
| 4 | Validación: middleware genérico con fábrica de schema, dominio sin zod y traducción de issues | A-10, R-62 |
| 5 | Errores tipados con handler central; qué errores de BD se traducen y cuáles son 500 | A-11 |
| 6 | better-sqlite3 con SQL a mano, migraciones numeradas, migración y seed de tasas al arrancar, seed demo aparte | A-15, A-16, A-17, A-20, R-63, R-71 |
| 7 | Inyección manual con `createApp(deps)` y separación app/server | A-12, A-13, R-74 |
| 8 | Dinero en céntimos enteros, tasas en puntos básicos, half-up entero | Spec 2.2 |
| 9 | Snapshot de tasa y tramos, e inmutabilidad por triggers | Spec RB-09, 4.5 |
| 10 | Una sola función de cálculo para preview y guardado, dentro de una transacción | Spec RB-10 |
| 11 | TanStack Query para estado de servidor: sin reintentos automáticos, preview como query, debounce propio | A-23, A-26, R-60, R-61 |
| 12 | Divisa: Context para la elección, conversión solo en frontend con big.js, total como suma de redondeados | A-24, Spec RB-14, R-65, R-76 |
| 13 | CORS directo sin proxy de Vite | A-30 |
| 14 | Pirámide de tests sin E2E, trazabilidad CA-XX y CA de verificación manual | A-31 a A-34, R-64 |

---

## Pendiente de verificar

No está contrastado contra documentación el comportamiento exacto de Express 5 y zod 4 en los puntos citados. Lo fijarán estos tests en cuanto existan:

| Punto | Test que lo fija |
|---|---|
| Código de issue de zod 4 para un decimal en un campo entero | CA-29 |
| Body vacío con `express.json` | CA-84 |
| Parser de query y parámetros no enteros | CA-75 |
| Parámetro repetido y forma `search[]=` con el parser `simple` | CA-109 |
| Checksum ejecutado aunque fallen otros campos | CA-110 |