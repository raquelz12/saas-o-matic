import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys.ts';
import { listSimulations } from '../../api/simulations.ts';
import type { Page, Simulation } from '../../api/types.ts';

/**
 * Página `page` del historial de simulaciones de un cliente (RF-35, spec 5.6), de la más reciente
 * a la más antigua. La página la guarda quien compone el historial, porque el guardado la devuelve
 * a 1 (RF-39). `pageSize` no se envía (20, el defecto del backend). La key cuelga de
 * `simulations.historyAll(id)`, que invalida el guardado.
 */
export function useSimulationHistory(
  customerId: number,
  page: number,
): UseQueryResult<Page<Simulation>> {
  const params = { page };
  return useQuery({
    queryKey: queryKeys.simulations.history(customerId, params),
    queryFn: ({ signal }) => listSimulations(customerId, params, signal),
  });
}
