import { useQuery, type Query, type UseQueryResult } from '@tanstack/react-query';
import { fetchFxRates, type FxRates } from './fxClient.ts';

// Tipos de cambio con TanStack Query (ADR-005, RF-41, RF-43). Key propia: `api/queryKeys.ts`
// es solo del backend (architecture §3).
export const fxRatesKey = ['fxRates'] as const;

/** Milisegundos que faltan hasta `time_next_update_unix` (0 si ya caducó o no hay datos). */
function msUntilExpiry(query: Query<FxRates>): number {
  const data = query.state.data;
  if (data === undefined) return 0;
  return Math.max(0, data.nextUpdateUnix * 1000 - Date.now());
}

/**
 * - `staleTime`: los tipos valen hasta `time_next_update_unix`, así que antes no se repite
 *   la petición (CA-103).
 * - `refetchInterval`: al caducar se piden de nuevo (RF-41). Si ese refresco falla, TanStack
 *   conserva los datos anteriores y no se programa otro intento: el reintento es manual (RF-43).
 * - `gcTime: Infinity`: la caché no se descarta aunque no haya observadores.
 */
export function useFxRates(): UseQueryResult<FxRates> {
  return useQuery({
    queryKey: fxRatesKey,
    queryFn: ({ signal }) => fetchFxRates(signal),
    staleTime: msUntilExpiry,
    gcTime: Infinity,
    // Tras un refresco fallido los datos siguen caducados (0 ms), así que no se reprograma.
    refetchInterval: (query) => msUntilExpiry(query) || false,
  });
}
