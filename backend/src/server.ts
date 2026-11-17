import { createApp } from './app.ts';
import { loadConfig } from './config/env.ts';
import { logger } from './shared/logger.ts';

// Arranque: config → app → listen. La BD y las migraciones llegan en T-11 y T-12.
const config = loadConfig();
const app = createApp({ config, logger });

app.listen(config.port, config.host, (error) => {
  if (error) {
    logger.error('Could not start the server', error);
    process.exitCode = 1;
    return;
  }
  logger.info(`Backend listening on http://${config.host}:${config.port}`);
});
