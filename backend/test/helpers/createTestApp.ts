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
 * App de prueba con la config por defecto y el logger silencioso.
 * Cualquier dependencia de `createApp` se puede sustituir (architecture §6).
 */
export function createTestApp(overrides: Partial<AppDeps> = {}): Express {
  return createApp({ config: loadConfig({}), logger: silentLogger, ...overrides });
}

/**
 * BD de prueba en `:memory:`, aislada en cada llamada, con `foreign_keys` activado,
 * las migraciones aplicadas y el seed de tasas (nunca el seed demo; architecture §6).
 * Va aparte de la app: `createApp` aún no recibe `db` (llegará con los repositorios).
 */
export function createTestDb(): Db {
  return prepareDatabase(':memory:');
}
