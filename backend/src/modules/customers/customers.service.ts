import type { Customer, CustomersRepository } from './customers.repository.ts';
import { searchKey } from './domain/searchKey.ts';

/**
 * Datos del alta ya validados y normalizados por el schema (spec 3.3). Se define
 * aquí para que el service no dependa de zod; `CreateCustomerInput` es compatible.
 */
export interface NewCustomer {
  companyName: string;
  taxId: string;
  email: string;
  country: string;
  plan: string;
}

export interface CustomersService {
  /** Alta de cliente (RF-01). Un par (país, identificador) repetido → `DuplicateError`. */
  create(input: NewCustomer): Customer;
}

export function createCustomersService(customersRepo: CustomersRepository): CustomersService {
  return {
    create: (input) =>
      customersRepo.insert({ ...input, companyNameSearch: searchKey(input.companyName) }),
  };
}
