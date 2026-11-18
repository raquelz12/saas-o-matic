import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../../api/client.ts';
import { getCustomer } from '../../api/customers.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import type { Customer } from '../../api/types.ts';

/** Datos de un cliente (`GET /customers/:id`, spec 5.5). */
export function useCustomer(id: number): UseQueryResult<Customer> {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: ({ signal }) => getCustomer(id, signal),
  });
}

/** Un 404 del backend: el cliente no existe y reintentar no sirve de nada (R-91). */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
