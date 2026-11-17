import { Router } from 'express';
import {
  emptyQuerySchema,
  idParamsSchema,
  paginationQuerySchema,
} from '../../http/commonSchemas.ts';
import { receiveJson } from '../../http/jsonBody.ts';
import { methodNotAllowed } from '../../http/methodNotAllowed.ts';
import { validate } from '../../http/validate.ts';
import type { SimulationsController } from './simulations.controller.ts';
import { simulationSchema } from './simulations.schemas.ts';

/**
 * Rutas de `/api/simulations` (spec 5.8, 5.9). Los dos `POST` pasan por la recepción
 * (415, 413, 400) y la validación (422) antes del controller; el resto de métodos da 405.
 * `/simulations/:id` no existe y cae en el 404 final (CA-25).
 */
export function createSimulationsRouter(controller: SimulationsController): Router {
  const router = Router();
  router
    .route('/')
    .post(
      ...receiveJson,
      validate({ query: emptyQuerySchema, body: simulationSchema }),
      controller.create,
    )
    .all(methodNotAllowed);
  router
    .route('/preview')
    .post(
      ...receiveJson,
      validate({ query: emptyQuerySchema, body: simulationSchema }),
      controller.preview,
    )
    .all(methodNotAllowed);
  return router;
}

/**
 * Historial de un cliente (spec 5.6), montado bajo `/api/customers` desde `app.ts`
 * (architecture §2). Solo admite `GET`; el resto de métodos da 405.
 */
export function createCustomerSimulationsRouter(controller: SimulationsController): Router {
  const router = Router();
  router
    .route('/:id/simulations')
    .get(validate({ params: idParamsSchema, query: paginationQuerySchema }), controller.history)
    .all(methodNotAllowed);
  return router;
}
