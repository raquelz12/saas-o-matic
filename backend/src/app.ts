import cors from 'cors';
import express, { type Express } from 'express';
import type { Config } from './config/env.ts';
import type { Db } from './db/connection.ts';
import { createErrorHandler } from './http/errorHandler.ts';
import { notFound } from './http/notFound.ts';
import { createCountriesController } from './modules/countries/countries.controller.ts';
import { createTaxRatesRepository } from './modules/countries/countries.repository.ts';
import { createCountriesRouter } from './modules/countries/countries.routes.ts';
import { createCountriesService } from './modules/countries/countries.service.ts';
import type { Logger } from './shared/logger.ts';

/** Dependencias sustituibles de la aplicación (architecture §1, ADR-002). */
export interface AppDeps {
  config: Pick<Config, 'corsOrigin'>;
  logger: Logger;
  /** Conexión ya migrada y con el seed de tasas (`prepareDatabase`). */
  db: Db;
}

/** Único punto de composición del backend (architecture §2). */
export function createApp({ config, logger, db }: AppDeps): Express {
  const app = express();

  // Primero, para que el preflight responda 204 antes que cualquier 404 o 405 (spec 5.1).
  // Con un array, `cors` solo devuelve Access-Control-Allow-Origin si el origen coincide;
  // con un string lo enviaría a cualquier origen (R-91).
  app.use(cors({ origin: [config.corsOrigin] }));

  const taxRatesRepo = createTaxRatesRepository(db);
  const countriesService = createCountriesService(taxRatesRepo);
  app.use('/api/countries', createCountriesRouter(createCountriesController(countriesService)));

  app.use(notFound);
  app.use(createErrorHandler(logger));
  return app;
}
