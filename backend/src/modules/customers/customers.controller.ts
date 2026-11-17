import type { RequestHandler } from 'express';
import { getValidated } from '../../http/validate.ts';
import type { CustomerSearch, CustomersService, NewCustomer } from './customers.service.ts';

export interface CustomersController {
  /** `POST /customers` → 201 con el `Customer` y `Location: /api/customers/{id}` (spec 5.3). */
  create: RequestHandler;
  /** `GET /customers/:id` → 200 con el `Customer` (spec 5.5). */
  getById: RequestHandler;
  /** `GET /customers` → 200 con el `Page<Customer>` (spec 5.4). */
  search: RequestHandler;
}

export function createCustomersController(service: CustomersService): CustomersController {
  return {
    create: (_req, res) => {
      const { body } = getValidated<NewCustomer>(res);
      const customer = service.create(body);
      res.status(201).location(`/api/customers/${customer.id}`).json(customer);
    },
    getById: (_req, res) => {
      const { params } = getValidated<unknown, unknown, { id: number }>(res);
      res.json(service.getById(params.id));
    },
    search: (_req, res) => {
      const { query } = getValidated<unknown, CustomerSearch>(res);
      res.json(service.search(query));
    },
  };
}
