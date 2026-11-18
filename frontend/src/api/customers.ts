import { request } from './client.ts';
import type { CreateCustomerInput, Customer, CustomerSearchParams, Page } from './types.ts';

// Clientes (spec 5.3–5.5). Un `search` vacío no se envía: el backend ya toma `""` por defecto.

export function listCustomers(
  params: CustomerSearchParams,
  signal?: AbortSignal,
): Promise<Page<Customer>> {
  const search = params.search === '' ? undefined : params.search;
  return request<Page<Customer>>('/customers', {
    query: { search, page: params.page, pageSize: params.pageSize },
    signal,
  });
}

export function getCustomer(id: number, signal?: AbortSignal): Promise<Customer> {
  return request<Customer>(`/customers/${id}`, { signal });
}

export function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return request<Customer>('/customers', { method: 'POST', body: input });
}
