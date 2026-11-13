# ADR-003 · better-sqlite3 sin ORM y migraciones SQL propias

Relacionado con: A-15, A-16, A-17, A-18 · RF-32 · Spec 4.1–4.7

## Contexto
El esquema usa tablas `STRICT`, `CHECK`, `UNIQUE` y triggers de inmutabilidad (4.1–4.5), y no todos los ORM saben expresar eso. La spec exige además migraciones y seed de tasas idempotentes, ejecutados al arrancar y también por comando (4.7), y que el mapeo entre `snake_case` y `camelCase` se haga en el repositorio (4.1).

## Opciones consideradas
- **better-sqlite3 + SQL parametrizado:** control total del SQL, API síncrona y su propio SQLite ≥ 3.37 incluido / el mapeo y el tipado de las filas se hacen a mano.
- **Drizzle:** SQL tipado y migraciones generadas / los triggers y `STRICT` siguen necesitando SQL crudo, y es una herramienta más.
- **Prisma:** muy productivo y bien documentado / genera su propio cliente y no modela ni triggers ni `STRICT`.

## Decisión
better-sqlite3 con SQL parametrizado, porque escribir el SQL da control total (A-15). Las migraciones son scripts SQL numerados (`001_init.sql`…) con un runner propio, sin dependencias (A-16). Se ejecutan al arrancar y también con `db:migrate`: al arrancar, el proyecto funciona sin pasos manuales, y el comando permite hacerlo de forma explícita (A-17). El mapeo de columnas se hace en cada repositorio, porque así es explícito y mantiene el tipado (A-18).

## Consecuencias
- El esquema de la spec se escribe tal cual, sin traducirlo a un DSL.
- La API síncrona permite transacciones síncronas y tests rápidos sobre `:memory:`.
- El runner es nuestro y hay que mantenerlo: control de versiones aplicadas, orden e idempotencia.
- El mapeo se repite en cada repositorio, y una columna mal escrita no la detecta el compilador: solo los tests.
- Es un módulo nativo, así que necesita un binario compatible con Node 22 en cada máquina y en CI.