import type { RequestHandler } from 'express';
import { getValidated } from '../../http/validate.ts';
import type { CustomersService, NewCustomer } from './customers.service.ts';

export interface CustomersController {
  /** `POST /customers` → 201 con el `Customer` y `Location: /api/customers/{id}` (spec 5.3). */
  create: RequestHandler;
}

export function createCustomersController(service: CustomersService): CustomersController {
  return {
    create: (_req, res) => {
      const { body } = getValidated<NewCustomer>(res);
      const customer = service.create(body);
      res.status(201).location(`/api/customers/${customer.id}`).json(customer);
    },
  };
}
