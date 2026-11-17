import { Router } from 'express';
import { emptyQuerySchema } from '../../http/commonSchemas.ts';
import { methodNotAllowed } from '../../http/methodNotAllowed.ts';
import { validate } from '../../http/validate.ts';
import type { CountriesController } from './countries.controller.ts';

/** Rutas de `/api/countries`: solo GET, sin parámetros de query (spec 5.7, 5.10). */
export function createCountriesRouter(controller: CountriesController): Router {
  const router = Router();
  router
    .route('/')
    .get(validate({ query: emptyQuerySchema }), controller.list)
    .all(methodNotAllowed);
  return router;
}
