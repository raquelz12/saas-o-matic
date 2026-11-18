import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '../../api/queryKeys.ts';
import { listSimulations } from '../../api/simulations.ts';
import type { Page, Simulation } from '../../api/types.ts';

export interface SimulationHistoryState {
  page: number;
  setPage: (page: number) => void;
  query: UseQueryResult<Page<Simulation>>;
}

/**
 * Historial paginado de simulaciones de un cliente (RF-35, spec 5.6), de la más reciente a la más
 * antigua. `pageSize` no se envía (20, el defecto del backend). La key cuelga de
 * `simulations.historyAll(id)`, que el guardado invalidará (RF-39).
 */
export function useSimulationHistory(customerId: number): SimulationHistoryState {
  const [page, setPage] = useState(1);
  const params = { page };
  const query = useQuery({
    queryKey: queryKeys.simulations.history(customerId, params),
    queryFn: ({ signal }) => listSimulations(customerId, params, signal),
  });
  return { page, setPage, query };
}
