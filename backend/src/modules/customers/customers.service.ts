import { NotFoundError } from '../../shared/errors.ts';
import type { Page, PageParams } from '../../shared/pagination.ts';
import type {
  Customer,
  CustomerSearchFilter,
  CustomersRepository,
} from './customers.repository.ts';
import { searchKey } from './domain/searchKey.ts';
import { normalizeTaxId } from './domain/taxId.ts';

/** Query validada de `GET /customers`; `search` ya llega recortado (spec 3.5). */
export interface CustomerSearch extends PageParams {
  search: string;
}

/**
 * Normaliza el texto buscado de las dos formas de RB-13. Vacío → sin filtro (RF-14).
 * Si la rama de identificador normaliza a vacío (`-`, `.`), se omite (RF-13).
 */
function toFilter(search: string): CustomerSearchFilter | undefined {
  if (search === '') return undefined;
  const taxIdKey = normalizeTaxId(search);
  return taxIdKey === ''
    ? { nameKey: searchKey(search) }
    : { nameKey: searchKey(search), taxIdKey };
}

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
  /** Detalle de cliente (RF-16). Si no existe → `NotFoundError` (404). */
  getById(id: number): Customer;
  /** Búsqueda y listado paginado (RF-11 a RF-15, RF-28). */
  search(query: CustomerSearch): Page<Customer>;
}

export function createCustomersService(customersRepo: CustomersRepository): CustomersService {
  return {
    create: (input) =>
      customersRepo.insert({ ...input, companyNameSearch: searchKey(input.companyName) }),
    getById: (id) => {
      const customer = customersRepo.findById(id);
      if (customer === undefined) throw new NotFoundError();
      return customer;
    },
    search: ({ search, page, pageSize }) => {
      const { items, total } = customersRepo.search(toFilter(search), { page, pageSize });
      return { items, page, pageSize, total };
    },
  };
}
