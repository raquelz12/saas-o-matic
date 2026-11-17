import { Router } from 'express';
import { emptyQuerySchema, idParamsSchema } from '../../http/commonSchemas.ts';
import { receiveJson } from '../../http/jsonBody.ts';
import { methodNotAllowed } from '../../http/methodNotAllowed.ts';
import { validate } from '../../http/validate.ts';
import type { CustomersController } from './customers.controller.ts';
import { buildCreateCustomerSchema, searchCustomersQuerySchema } from './customers.schemas.ts';

/**
 * Rutas de `/api/customers` (spec 5.3, 5.4) y `/api/customers/:id` (spec 5.5). Ninguna
 * admite edición ni borrado: el resto de métodos da 405 (RF-10). `supportedCountries` lee los países de
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
    .get(validate({ query: searchCustomersQuerySchema }), controller.search)
    .post(
      ...receiveJson,
      validate({
        query: emptyQuerySchema,
        body: () => buildCreateCustomerSchema(supportedCountries()),
      }),
      controller.create,
    )
    .all(methodNotAllowed);
  router
    .route('/:id')
    .get(validate({ params: idParamsSchema, query: emptyQuerySchema }), controller.getById)
    .all(methodNotAllowed);
  return router;
}
