import { useRef } from 'react';
import type { SimulationInput } from '../../api/types.ts';
import { ErrorState } from '../../shared/ErrorState.tsx';
import styles from './Simulator.module.css';
import { useSaveSimulation } from './useSaveSimulation.ts';

export const SAVE_ERROR_MESSAGE = 'No se ha podido guardar la simulación.';

export type SaveSimulationButtonProps = {
  /** Valores actuales de los controles. */
  input: SimulationInput;
  /** Los tres controles son válidos; si no, no se guarda (no serían los valores que se ven). */
  valid: boolean;
  onSaved: () => void;
};

// Guardado de la simulación actual (RF-39). El botón se deshabilita mientras la petición está en
// curso. TanStack notifica `isPending` de forma asíncrona, así que un segundo clic en el mismo tick
// todavía vería el botón habilitado: la `ref` lo descarta de forma síncrona. Si falla, se avisa y
// se reintenta pulsando otra vez (RF-43). Guardar no resetea los controles.
export function SaveSimulationButton({ input, valid, onSaved }: SaveSimulationButtonProps) {
  const save = useSaveSimulation(input.customerId, onSaved);
  const inFlight = useRef(false);

  function handleClick(): void {
    if (inFlight.current) return;
    inFlight.current = true;
    save.mutate(input, {
      onSettled: () => {
        inFlight.current = false;
      },
    });
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.save}
        disabled={!valid || save.isPending}
        onClick={handleClick}
      >
        {save.isPending ? 'Guardando…' : 'Guardar'}
      </button>
      {save.isError && <ErrorState message={SAVE_ERROR_MESSAGE} />}
    </div>
  );
}
