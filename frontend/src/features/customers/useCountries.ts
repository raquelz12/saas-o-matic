import { useQuery } from '@tanstack/react-query';
import { listCountries } from '../../api/countries.ts';
import { queryKeys } from '../../api/queryKeys.ts';

/** Catálogo de países soportados de `GET /countries` (RF-37). */
export function useCountries() {
  return useQuery({
    queryKey: queryKeys.countries.all,
    queryFn: ({ signal }) => listCountries(signal),
  });
}
