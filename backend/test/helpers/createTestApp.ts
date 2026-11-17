import type { Express } from 'express';
import { createApp, type AppDeps } from '../../src/app.ts';
import { loadConfig } from '../../src/config/env.ts';
import type { Db } from '../../src/db/connection.ts';
import { prepareDatabase } from '../../src/db/prepareDatabase.ts';
import type { Logger } from '../../src/shared/logger.ts';

/** Logger que no escribe nada, para no ensuciar la salida de los tests. */
export const silentLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * App de prueba con la config por defecto, el logger silencioso y una BD nueva
 * de `createTestDb()`. Cualquier dependencia de `createApp` se puede sustituir
 * (architecture §6); para leer o editar la BD en el test, se crea y se pasa con `{ db }`.
 */
export function createTestApp(overrides: Partial<AppDeps> = {}): Express {
  const { db = createTestDb(), ...rest } = overrides;
  return createApp({ config: loadConfig({}), logger: silentLogger, db, ...rest });
}

/**
 * BD de prueba en `:memory:`, aislada en cada llamada, con `foreign_keys` activado,
 * las migraciones aplicadas y el seed de tasas (nunca el seed demo; architecture §6).
 * Va aparte de la app para que el test conserve la conexión (R-105, T-16).
 */
export function createTestDb(): Db {
  return prepareDatabase(':memory:');
}
