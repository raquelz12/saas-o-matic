import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '../../api/queryKeys.ts';
import { previewSimulation } from '../../api/simulations.ts';
import type { SimulationInput, SimulationPreview } from '../../api/types.ts';
import { useDebouncedValue } from '../../shared/useDebouncedValue.ts';

/** Debounce del preview (RF-38). */
export const PREVIEW_DEBOUNCE_MS = 250;

export interface PreviewState {
  /** Última proyección válida: se conserva mientras llega la siguiente y si esta falla (RF-43). */
  projection: SimulationPreview | undefined;
  /** Todavía no ha llegado ninguna proyección. */
  isLoading: boolean;
  /** Ha fallado el preview de los valores actuales. */
  isError: boolean;
  /** Reintento manual del preview actual (RF-43). */
  retry: () => void;
}

/**
 * Preview en tiempo real de una simulación (RF-38, architecture §3). La key son los valores con
 * debounce de 250 ms, así que cada cambio en ese plazo reinicia la espera. La query pasa su `signal`
 * a `fetch`: al cambiar la key, TanStack aborta la petición anterior y solo se pinta la respuesta de
 * la key actual. `keepPreviousData` no cubre el error, así que se guarda la última proyección válida.
 * `input` debe ser siempre válido (spec 3.4): el simulador no lo cambia mientras un control no lo es.
 */
export function usePreview(input: SimulationInput): PreviewState {
  const debounced = useDebouncedValue(input, PREVIEW_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: queryKeys.simulations.preview(debounced),
    queryFn: ({ signal }) => previewSimulation(debounced, signal),
    placeholderData: keepPreviousData,
  });

  // Información de renders anteriores (patrón de la documentación de React): sin efecto ni ref.
  const [lastValid, setLastValid] = useState<SimulationPreview | undefined>(undefined);
  if (query.data !== undefined && query.data !== lastValid) setLastValid(query.data);

  const projection = query.data ?? lastValid;
  return {
    projection,
    isLoading: projection === undefined && !query.isError,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
