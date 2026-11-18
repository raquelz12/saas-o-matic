# SaaS-O-Matic

Herramienta interna para simular y presupuestar suscripciones SaaS multi-divisa. Permite dar de alta clientes corporativos, buscarlos, simular el coste mensual de su suscripción (precio por tramos de usuarios más el impuesto de su país) y guardar las simulaciones en un historial que no se puede modificar. Los importes se calculan en el backend, en céntimos de EUR. El frontend puede mostrarlos en USD, GBP o JPY, solo a efectos de visualización.

No tiene autenticación: está pensada para usarse en local, y el backend solo escucha por defecto en `127.0.0.1` (RNF-03).

## Requisitos

- **Node.js 24 LTS**, con npm. La versión está fijada en [.nvmrc](.nvmrc) y en `engines` del [package.json](package.json) (RNF-01).
- Nada más. No hace falta instalar SQLite: `better-sqlite3` incluye el suyo (spec 4.7), ni compilar nada si instalas como se indica en el [arranque rápido](#arranque-rápido).

## Arranque rápido

```bash
nvm use                   # o instala Node 24 de cualquier otra forma
npm ci --ignore-scripts   # instala las dependencias de los dos workspaces
npm run db:seed:demo      # opcional: crea 10 clientes de ejemplo
npm run dev               # arranca el backend y el frontend a la vez
```

Abre <http://localhost:5173>.

- **Por qué `--ignore-scripts`:** `better-sqlite3` ya incluye el binario compilado para Windows, Linux y macOS (`prebuilds/`). Sin embargo, como el paquete contiene un `binding.gyp`, npm intenta compilarlo con `node-gyp`, y eso falla si no tienes instaladas las herramientas de C++ (en Windows, Visual Studio Build Tools con «Desktop development with C++»). La opción se salta esa compilación. El único otro paquete con script de instalación es `fsevents`, que es opcional y solo para macOS. Si tienes las herramientas de C++, también funciona `npm ci` sin la opción.
- **Archivos `.env`:** no son necesarios. Todas las variables tienen un valor por defecto ([Variables de entorno](#variables-de-entorno)). Si no existen, Node escribe al arrancar `.env not found. Continuing without it.`: es solo un aviso.
- **Base de datos:** se crea sola en `backend/data/saas-o-matic.db`. Al arrancar, el servidor aplica las migraciones pendientes y carga las tasas de impuesto, así que no hay que ejecutar `db:migrate` ni `db:seed` antes (spec 4.7).
- **Tipos de cambio:** el frontend los pide a una API pública ([open.er-api.com](https://open.er-api.com)), así que necesita conexión a internet. Sin conexión, la aplicación funciona igual, pero solo en EUR (RF-43).

## Scripts

Se ejecutan desde la raíz del repositorio.

| Script | Qué hace |
|---|---|
| `npm run dev` | Arranca a la vez el backend (puerto 3000, se reinicia al cambiar el código) y el frontend con Vite (puerto 5173). |
| `npm test` | Ejecuta con Vitest los tests de los dos workspaces. |
| `npm run lint` | ESLint (incluidas las reglas de importación entre capas) y Prettier en modo comprobación. |
| `npm run typecheck` | `tsc --noEmit` en los dos workspaces. |
| `npm run db:migrate` | Aplica las migraciones pendientes de `backend/migrations/` sobre la BD de `DB_PATH`. Es idempotente. |
| `npm run db:seed` | Carga las tasas iniciales de impuesto con `INSERT OR IGNORE`, de modo que no sobrescribe las tasas editadas a mano. |
| `npm run db:seed:demo` | Migra, carga las tasas y crea 10 clientes ficticios que cubren los 7 países y los 3 planes. Si ya hay algún cliente, no inserta nada. No crea simulaciones. |

En CI ([ci.yml](.github/workflows/ci.yml)) se ejecutan `lint`, `typecheck` y `test` en cada pull request.

## Variables de entorno

Para cambiar un valor, copia el `.env.example` del workspace como `.env` en la misma carpeta y edítalo (RNF-02). Los `.env` no se suben al repositorio.

**Backend** ([backend/.env.example](backend/.env.example)). Se valida al arrancar: si hay un valor no válido, el proceso termina con un error que nombra la variable.

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto del backend. |
| `HOST` | `127.0.0.1` | Interfaz de escucha. No hay autenticación, así que por defecto solo es accesible en local. |
| `DB_PATH` | `./data/saas-o-matic.db` | Archivo SQLite, relativo a `backend/`. Si la carpeta no existe, se crea. |
| `CORS_ORIGIN` | `http://localhost:5173` | Único origen al que se permite llamar a la API: el frontend. |

**Frontend** ([frontend/.env.example](frontend/.env.example)). Vite lee las variables al arrancar: después de cambiarlas, hay que reiniciar `npm run dev`.

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | URL base del backend, sin `/api` (el cliente lo añade). |
| `VITE_FX_URL` | `https://open.er-api.com/v6/latest/EUR` | API de tipos de cambio con base EUR. |

Si cambias el puerto de uno de los dos, ajusta también el otro lado: `CORS_ORIGIN` si cambia el frontend y `VITE_API_URL` si cambia el backend. El puerto del frontend (5173) está fijado en [vite.config.ts](frontend/vite.config.ts) con `strictPort`, así que, si está ocupado, Vite no arranca en lugar de cambiar a otro puerto.

## Tasas de impuesto

Las tasas están en la tabla `tax_rates`, en puntos básicos (`2100` = 21 %). Valores iniciales: ES 21 %, FR 20 %, DE 19 %, IT 22 %, PT 23 %, NL 21 % y GB 20 % (RF-32). No hay endpoint para cambiarlas, así que se editan directamente en la base de datos. Cada simulación guarda la tasa que se le aplicó, de modo que cambiar una tasa no altera las simulaciones ya guardadas.

## Limitaciones conocidas

Simplificaciones aceptadas en la spec (1.7):

- **IVA:** se aplica siempre la tasa general del país del cliente. No se contemplan la inversión del sujeto pasivo intracomunitaria, los tipos reducidos ni los regímenes territoriales (Canarias, Azores, Madeira).
- **Enteros en JSON:** JSON no distingue `10` de `10.0`, así que la API acepta `10.0` como 10. Del mismo modo, acepta `1e3` como 1000 y `-0` como 0. Las cadenas (`"10"`) se rechazan.
- **Búsqueda sin diacríticos:** `ß`, `æ`, `ø` y `ł` no se descomponen, así que, por ejemplo, `lodz` no encuentra `Łódź`.
- **Slider y API:** el slider del simulador llega hasta 500 usuarios por usabilidad, pero la API acepta hasta 1000.

Fuera de alcance (spec 1.6): editar o borrar clientes y simulaciones, cobrar por almacenamiento o por llamadas a la API, convertir divisas en el backend, modificar las tasas mediante la API y la autenticación.

## Estructura

```
backend/    API REST con Express 5, SQLite (better-sqlite3) y zod
  migrations/   SQL numerado
  src/modules/  customers, simulations y countries, con capas routes → controller → service → repository y un domain/ puro
frontend/   React + Vite, TanStack Query y CSS Modules
ai-workspace/   especificación, arquitectura, ADRs, plan y registro de revisiones
```

## Documentación

- [Especificación](ai-workspace/01-specs/spec.md): requisitos, reglas de negocio, validaciones, modelo de datos, contrato de la API (sección 5) y casos de aceptación.
- [Arquitectura](ai-workspace/02-architecture/architecture.md) y [ADRs](ai-workspace/02-architecture/adr/README.md).
- [Plan de implementación](ai-workspace/03-plan/plan.md) y [registro de revisiones](ai-workspace/05-review-log.md).
- [Cómo se ha trabajado con la IA](ai-workspace/README.md).
