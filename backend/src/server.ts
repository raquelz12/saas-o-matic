import { createApp } from './app.ts';
import { loadConfig } from './config/env.ts';
import { prepareDatabase } from './db/prepareDatabase.ts';
import { logger } from './shared/logger.ts';

// Arranque: config → BD (migrar + seed de tasas) → app → listen (architecture §1, R-71).
// Si la migración falla, el error termina el proceso antes de escuchar.
// La conexión queda abierta mientras el servidor escucha: la usan los repositorios.
const config = loadConfig();
const db = prepareDatabase(config.dbPath);
const app = createApp({ config, logger, db });

app.listen(config.port, config.host, (error) => {
  if (error) {
    logger.error('Could not start the server', error);
    db.close();
    process.exitCode = 1;
    return;
  }
  logger.info(`Backend listening on http://${config.host}:${config.port}`);
});
