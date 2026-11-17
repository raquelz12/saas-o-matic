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
import { createCustomersController } from './modules/customers/customers.controller.ts';
import { createCustomersRepository } from './modules/customers/customers.repository.ts';
import { createCustomersRouter } from './modules/customers/customers.routes.ts';
import { createCustomersService } from './modules/customers/customers.service.ts';
import { createSimulationsController } from './modules/simulations/simulations.controller.ts';
import {
  createSimulationsRepository,
  type SimulationsRepository,
} from './modules/simulations/simulations.repository.ts';
import { createSimulationsRouter } from './modules/simulations/simulations.routes.ts';
import { createSimulationsService } from './modules/simulations/simulations.service.ts';
import type { Logger } from './shared/logger.ts';

/** Dependencias sustituibles de la aplicación (architecture §1, ADR-002). */
export interface AppDeps {
  config: Pick<Config, 'corsOrigin'>;
  logger: Logger;
  /** Conexión ya migrada y con el seed de tasas (`prepareDatabase`). */
  db: Db;
  /** Sustituto del repositorio de simulaciones; por defecto, el de `db` (CA-89). */
  simulationsRepo?: SimulationsRepository;
}

/** Único punto de composición del backend (architecture §2). */
export function createApp({ config, logger, db, simulationsRepo }: AppDeps): Express {
  const app = express();

  // Primero, para que el preflight responda 204 antes que cualquier 404 o 405 (spec 5.1).
  // Con un array, `cors` solo devuelve Access-Control-Allow-Origin si el origen coincide;
  // con un string lo enviaría a cualquier origen (R-91).
  app.use(cors({ origin: [config.corsOrigin] }));

  const taxRatesRepo = createTaxRatesRepository(db);
  const countriesService = createCountriesService(taxRatesRepo);
  app.use('/api/countries', createCountriesRouter(createCountriesController(countriesService)));

  const customersRepo = createCustomersRepository(db);
  const customersService = createCustomersService(customersRepo);
  app.use(
    '/api/customers',
    createCustomersRouter(createCustomersController(customersService), () =>
      taxRatesRepo.listCodes(),
    ),
  );

  const simulationsService = createSimulationsService({
    customersRepo,
    taxRatesRepo,
    simulationsRepo: simulationsRepo ?? createSimulationsRepository(db),
    // El service no importa better-sqlite3: recibe la transacción ya construida (architecture §4).
    runInTransaction: (fn) => db.transaction(fn)(),
  });
  app.use(
    '/api/simulations',
    createSimulationsRouter(createSimulationsController(simulationsService)),
  );

  app.use(notFound);
  app.use(createErrorHandler(logger));
  return app;
}
