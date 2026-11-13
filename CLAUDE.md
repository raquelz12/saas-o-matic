# SaaS-O-Matic — Directrices para la IA

## Fuentes de verdad
- Especificación: ai-workspace/01-specs/spec.md (v1.2). Ante la duda, manda la spec.
- Arquitectura: ai-workspace/02-architecture/architecture.md y adr/.
- No implementes nada que no esté en la spec. Si algo es ambiguo, PREGUNTA antes de asumir.

## Stack

**General**
- Node.js 24 LTS (fijado en `.nvmrc` y `engines`)
- TypeScript con `strict: true` y `noUncheckedIndexedAccess`
- Monorepo con npm workspaces: `backend/` y `frontend/`
- ESLint + Prettier (con reglas de importación entre capas y límites de tamaño)
- Vitest para todos los tests
- GitHub Actions: lint, typecheck y tests en cada PR

**Backend**
- Express 5
- SQLite con better-sqlite3 (SQL a mano, sin ORM)
- Migraciones con scripts SQL numerados
- zod para validar las peticiones y la configuración (`.env`)
- Supertest para los tests de la API
- CORS con la variable `CORS_ORIGIN`
- Logging con `console`, centralizado en `logger.ts`

**Frontend**
- React + Vite
- React Router
- TanStack Query para los datos del servidor
- React Context para la divisa seleccionada
- CSS Modules + un `global.css` con variables
- Vitest + Testing Library

**No usar** (no añadir sin mi aprobación)
- ORMs, contenedores de DI, librerías de estado global (Redux, Zustand), librerías de formularios, Tailwind ni librerías de componentes.

## Estructura
Sigue la de ai-workspace/02-architecture/architecture.md, si alguna carpeta o archivo no está puedes crearlo.

## Reglas de capas
- domain/ es puro: no importa express, better-sqlite3 ni modules/.
- SQL solo en *.repository.ts, siempre parametrizado.
- Controllers sin lógica de negocio.
- Frontend: HTTP solo desde src/api/.

## Reglas de código
- TypeScript strict; prohibido `any`.
- Dinero en céntimos (integer). Nunca float en el backend.
- Máx ~200 líneas por archivo y ~40 por función.
- Nada de utils.ts genéricos: cada helper vive junto a quien lo usa.
- Sin dependencias nuevas sin mi aprobación explícita.

## Cómo trabajar conmigo
- Una tarea (T-XX) cada vez. Toca solo los archivos que te indique.
- En domain/: primero los tests (con los CA-XX de la spec), espera mi OK y luego implementa.
- Nombra los tests con el CA que cubren: `it('CA-04: 15 usuarios → 14000', ...)`.
- Al terminar: lista de archivos tocados, decisiones tomadas y riesgos o dudas.
- No modifiques la spec ni este archivo salvo que te lo pida.

## Comandos
npm run dev · npm test · npm run lint · npm run db:migrate
(se completan en T-01)