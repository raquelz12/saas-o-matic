import type { Express } from 'express';
import { createApp, type AppDeps } from '../../src/app.ts';
import { loadConfig } from '../../src/config/env.ts';
import { openDatabase, type Db } from '../../src/db/connection.ts';
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
 * BD de prueba en `:memory:` con `foreign_keys` activado, aislada en cada llamada.
 * Por ahora va aparte de la app: `createApp` aún no recibe `db` (llegará con los
 * repositorios), y las migraciones y el seed de tasas se añaden en T-12.
 */
export function createTestDb(): Db {
  return openDatabase(':memory:');
}
