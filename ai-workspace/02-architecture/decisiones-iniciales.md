# Decisiones iniciales de arquitectura

Decisiones tomadas por mí antes de pedir a la IA una propuesta de arquitectura.
Lo que cambie después queda en el review-log (Fase 2) y en los ADRs.

## 1. Repositorio y herramientas

| # | Decisión | Opciones | Mi decisión | Motivo |
|---|---|---|---|---|
| A-01 | Organización del repo | Dos proyectos independientes · npm workspaces · pnpm/turborepo | npm workspaces | Sencillez |
| A-02 | Gestor de paquetes | npm · pnpm | npm | Viene con Node |
| A-03 | Versión de Node | 20 LTS · 22 LTS | 22 LTS | Más actual |
| A-04 | TypeScript | `strict: true` · flexible | strict:true | Ya que se va a generar contenido con la IA es más seguro para el código |
| A-05 | Lint y formato | ESLint + Prettier · Biome | ESLint + Prettier | Con ESLint puedo imponer reglas de capas automáticamente |
| A-06 | Código compartido front/back | Paquete `shared` (tipos) · sin compartir | Sin compartir | No es necesario y es más complejo |

## 2. Backend

| # | Decisión | Opciones | Mi decisión | Motivo |
|---|---|---|---|---|
| A-07 | Framework HTTP | Express · Fastify · Hono | Express | Más conocido |
| A-08 | Organización del código | Por módulo (`customers/`, `simulations/`) · por tipo (`controllers/`, `services/`) | Por módulos | Escala mejor |
| A-09 | Capas y dependencias | routes → controller → service → repository; dominio puro | Ya está en la spec | Que el service llame al dominio, nunca al revés. |
| A-10 | Validación de entrada | zod (spec) · ¿middleware genérico o por ruta? | zod con un middleware genérico | Validación sencilla pero hay que mapear los códigos de error |
| A-11 | Manejo de errores | Errores tipados + middleware central · try/catch por ruta | Errores tipados + middleware central | Todos los errores tendran un formato indicado en el spec  |
| A-12 | Inyección de dependencias | Manual (pasar repos al service) · contenedor · imports directos | Manual | Para tres módulos un contenedor esta sobredimensionado |
| A-13 | Separación app / server | `app.ts` testeable + `server.ts` arranque · todo junto | app.ts + server.ts | Los test son más rápidos y aislados |
| A-14 | Logging | console · pino | console en logger.ts | Al ser en local valdría con el módulo |

## 3. Datos

| # | Decisión | Opciones | Mi decisión | Motivo |
|---|---|---|---|---|
| A-15 | Acceso a SQLite | better-sqlite3 + SQL · Drizzle · Prisma | better-sqlite3 con SQL parametrizado | Escribir el SQL da control total |
| A-16 | Migraciones | Scripts SQL numerados propios · herramienta | Scripts SQL numerados | Sin dependencias |
| A-17 | Cuándo se migra | Al arrancar · comando npm · ambos | Ambos | Al arrancar, el proyecto funciona sin pasos manuales; el comando permite ejecutarlo de forma explícita. |
| A-18 | Mapeo snake_case ↔ camelCase | En el repositorio · utilidad genérica | En el repo | Es explícito y mantiene el tipado. |
| A-19 | BD en tests | SQLite en memoria (`:memory:`) · archivo temporal | SQLite en memoria con las migraciones aplicadas en cada test | Es muy rápido |
| A-20 | Datos de ejemplo | Seed de clientes demo · solo tasas | Seed de clientes demo | Para poder probarla sin dar de alta clientes a mano |

## 4. Frontend

| # | Decisión | Opciones | Mi decisión | Motivo |
|---|---|---|---|---|
| A-21 | Build | Vite · Next.js | Vite | No es necesario lo que añade Next.js y tiene arranque y carga rápidos |
| A-22 | Routing | React Router · sin router (estado) | React Router | Para que no se pierdan las URL propias al recargarse |
| A-23 | Datos del servidor | TanStack Query · fetch + useState | TanStack Query | 	Resuelve los estados de carga y error, el reintento, la caché de los tipos de cambio y la cancelación de peticiones |
| A-24 | Estado global (divisa) | Context · Zustand | Context | Solo hay que compartir la divisa elegida. |
| A-25 | Capa de API | Cliente centralizado (`api/`) · fetch en componentes | Cliente centralizado en src/api/ | Un único punto que añade el prefijo /api, interpreta el formato de error y lanza un error tipado. |
| A-26 | Debounce y cancelación del preview (R-01) | Hook propio · lo que dé TanStack Query | TanStack Query | Más sencillo |
| A-27 | Formularios | react-hook-form · controlados a mano | controlados a mano | Formularios sencillos |
| A-28 | Estilos | CSS Modules · Tailwind · librería de componentes | CSS modules | Sin dependencias y gran manejo y experiencia |
| A-29 | Organización del código | Por feature (`customers/`, `simulation/`, `currency/`) · por tipo | Por feature | Agrupados por funcionalidad |
| A-30 | Desarrollo local front → back | Proxy de Vite · CORS directo | CORS directo | Ya en el spec |

## 5. Calidad

| # | Decisión | Opciones | Mi decisión | Motivo |
|---|---|---|---|---|
| A-31 | Tests backend | Vitest · Jest; + Supertest para la API | Vitest + Supertest | Funciona directamente con TypeScript |
| A-32 | Tests frontend | Vitest + Testing Library · ninguno · solo lógica (conversión) | Vitest + Testing Library | Se testean la conversión de divisa y el half-up, el hook de debounce y la muestra de errores del formulario. No se busca cubrir toda la interfaz. |
| A-33 | Qué se testea primero | Dominio (TDD) → API → frontend | Dominio con TDD → API → frontend | Lo más importante primero |
| A-34 | Trazabilidad de tests | Nombrar tests con su CA-XX | Nombrar tests con su CA-XX | Enlaza directamente cada caso de aceptación de la spec con su test, y permite ver qué CA están cubiertos. |
| A-35 | CI | GitHub Actions (lint + test) · ninguna | GitHub Actions | Sencillo y fiable |

## 6. Configuración y entrega

| # | Decisión | Opciones | Mi decisión | Motivo |
|---|---|---|---|---|
| A-36 | Configuración | `.env` + `.env.example` validado con zod al arrancar | .env + .env.example, validado con zod al arrancar y con valores por defecto | Si una variable es incorrecta, el backend falla al arrancar con un mensaje claro. |
| A-37 | Arranque local | Un comando en la raíz (`npm run dev` levanta ambos) · por separado | npm run dev en la raíz con concurrently, más dev:backend y dev:frontend | El enunciado pide levantarlo en pocos pasos y sin fricción. |