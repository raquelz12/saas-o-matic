import type { Express } from 'express';
import { createApp, type AppDeps } from '../../src/app.ts';
import { loadConfig } from '../../src/config/env.ts';
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
