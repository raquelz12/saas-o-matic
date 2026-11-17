import { Router } from 'express';
import { emptyQuerySchema } from '../../http/commonSchemas.ts';
import { receiveJson } from '../../http/jsonBody.ts';
import { methodNotAllowed } from '../../http/methodNotAllowed.ts';
import { validate } from '../../http/validate.ts';
import type { SimulationsController } from './simulations.controller.ts';
import { simulationSchema } from './simulations.schemas.ts';

/**
 * Rutas de `/api/simulations` (spec 5.9). `POST /preview` pasa por la recepción
 * (415, 413, 400) y la validación (422) antes del controller; el resto de métodos da 405.
 */
export function createSimulationsRouter(controller: SimulationsController): Router {
  const router = Router();
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
