# ADR-001 · Monorepo con npm workspaces

Relacionado con: A-01, A-02, A-38 · RNF-01 · Spec 4.7

## Contexto
El backend (Node + TypeScript + SQLite) y el frontend (React) viven en el mismo repositorio, y el proyecto tiene que arrancar en pocos pasos. La spec fija Node 24 en `.nvmrc` y `engines` (RNF-01), y pide que `npm run dev` arranque las dos partes a la vez con `concurrently` (4.7).

## Opciones consideradas
- **Dos proyectos independientes:** aislamiento total y nada que configurar en la raíz / dos `npm install`, scripts duplicados y versiones de herramientas que se desalinean.
- **npm workspaces:** un solo install y un solo lockfile, scripts en la raíz y ninguna herramienta extra / no hay caché de tareas ni orquestación de builds.
- **pnpm + Turborepo:** instalación más rápida y estricta, y caché de tareas / dos herramientas más que instalar y aprender para solo dos paquetes.

## Decisión
npm workspaces, con npm como gestor de paquetes. El motivo principal es la sencillez (A-01). npm viene con Node, así que no añade ninguna herramienta (A-02). La raíz contiene el `package.json` con los workspaces `backend` y `frontend`, el campo `engines` y los scripts `dev`, `lint`, `typecheck` y `test`, más el `.nvmrc`.

## Consecuencias
- Un `npm install` y un `npm run dev` levantan todo el proyecto.
- Hay un único lockfile, y las herramientas comunes (TypeScript, ESLint, Vitest) quedan en la misma versión.
- npm sube las dependencias a la raíz (hoisting), así que un paquete puede importar una dependencia que no declara y funcionar por casualidad. pnpm lo impediría.
- No hay caché de tareas: CI ejecuta siempre lint y tests completos. Con dos paquetes es aceptable.