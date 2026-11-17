import { Router } from 'express';
import { emptyQuerySchema } from '../../http/commonSchemas.ts';
import { receiveJson } from '../../http/jsonBody.ts';
import { methodNotAllowed } from '../../http/methodNotAllowed.ts';
import { validate } from '../../http/validate.ts';
import type { CustomersController } from './customers.controller.ts';
import { buildCreateCustomerSchema } from './customers.schemas.ts';

/**
 * Rutas de `/api/customers` (spec 5.3). `supportedCountries` lee los países de
 * `tax_rates` en cada petición, sin caché (architecture §2); llega desde `app.ts`
 * porque las rutas no pueden importar repositorios.
 */
export function createCustomersRouter(
  controller: CustomersController,
  supportedCountries: () => readonly string[],
): Router {
  const router = Router();
  router
    .route('/')
    .post(
      ...receiveJson,
      validate({
        query: emptyQuerySchema,
        body: () => buildCreateCustomerSchema(supportedCountries()),
      }),
      controller.create,
    )
    .all(methodNotAllowed);
  return router;
}
