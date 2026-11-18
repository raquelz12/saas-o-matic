import { request } from './client.ts';
import type { CountryList } from './types.ts';

// Catálogo de países soportados (spec 5.7), sin paginación.

export function listCountries(signal?: AbortSignal): Promise<CountryList> {
  return request<CountryList>('/countries', { signal });
}
