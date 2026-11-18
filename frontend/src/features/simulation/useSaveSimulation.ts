import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys.ts';
import { saveSimulation } from '../../api/simulations.ts';

/**
 * Guardado de la simulación actual (RF-39). Sin idempotency key (descartada por la spec): el
 * simulador deshabilita el botón mientras `isPending`. Tras un 201 llama a `onSaved` (vuelta a la
 * página 1 del historial) e invalida todas sus páginas, así que se vuelve a pedir la página 1. La
 * mutación sigue pendiente hasta que termina la invalidación, para que el botón no se habilite
 * antes de que el historial refleje la simulación. Sin reintento automático (RF-43).
 */
export function useSaveSimulation(customerId: number, onSaved: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSimulation,
    onSuccess: async () => {
      onSaved();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.simulations.historyAll(customerId),
      });
    },
  });
}
