import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { listCustomers } from '../../api/customers.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import type { Customer, Page } from '../../api/types.ts';
import { useDebouncedValue } from '../../shared/useDebouncedValue.ts';

/** Debounce del buscador (RF-34). */
export const SEARCH_DEBOUNCE_MS = 300;

export interface CustomerSearch {
  /** Texto del buscador tal cual se escribe. */
  search: string;
  setSearch: (value: string) => void;
  page: number;
  setPage: (page: number) => void;
  query: UseQueryResult<Page<Customer>>;
}

/**
 * Búsqueda paginada de clientes (RF-34). La query usa el texto debounced a 300 ms. La página se
 * guarda junto al texto al que corresponde: cuando cambia el texto debounced vuelve a 1, sin pedir
 * antes la página 1 del texto anterior. `pageSize` no se envía (20, el defecto del backend).
 */
export function useCustomerSearch(): CustomerSearch {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [paging, setPaging] = useState({ search: debouncedSearch, page: 1 });

  // Ajuste de estado durante el render (patrón de React): nueva búsqueda → página 1.
  if (paging.search !== debouncedSearch) {
    setPaging({ search: debouncedSearch, page: 1 });
  }
  const page = paging.search === debouncedSearch ? paging.page : 1;
  const params = { search: debouncedSearch, page };

  const query = useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: ({ signal }) => listCustomers(params, signal),
  });

  const setPage = (next: number) => {
    setPaging({ search: debouncedSearch, page: next });
  };

  return { search, setSearch, page, setPage, query };
}
