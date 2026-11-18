import { useState } from 'react';
import { useParams } from 'react-router';
import { CustomerDetailCard } from '../features/customers/CustomerDetailCard.tsx';
import { isNotFoundError, useCustomer } from '../features/customers/useCustomer.ts';
import { SimulationHistory } from '../features/simulation/SimulationHistory.tsx';
import { Simulator } from '../features/simulation/Simulator.tsx';
import { ErrorState } from '../shared/ErrorState.tsx';
import { LoadingState } from '../shared/LoadingState.tsx';

export const NOT_FOUND_MESSAGE = 'Cliente no encontrado.';
export const CUSTOMER_ERROR_MESSAGE = 'No se ha podido cargar el cliente.';

/** Máximo de un id del backend (INTEGER de 32 bits, spec 3.5). */
const MAX_ID = 2_147_483_647;

/** `:id` de la URL como entero positivo sin ceros a la izquierda (spec 3.5); si no, `undefined`. */
export function parseCustomerId(raw: string | undefined): number | undefined {
  if (raw === undefined || !/^[1-9][0-9]*$/.test(raw)) return undefined;
  const id = Number(raw);
  return id <= MAX_ID ? id : undefined;
}

// Tarjeta del cliente y, cuando ha cargado, su historial (no se piden en paralelo: con un id
// inexistente habría dos 404). Un 404 no tiene reintento (R-91); el resto de errores sí (RF-43).
// La página del historial vive aquí porque el guardado del simulador la devuelve a 1 (RF-39) y
// las features no se importan entre sí.
function CustomerDetailContent({ customerId }: { customerId: number }) {
  const query = useCustomer(customerId);
  const [historyPage, setHistoryPage] = useState(1);
  if (query.isPending) return <LoadingState label="Cargando cliente…" />;
  if (query.isError) {
    if (isNotFoundError(query.error)) return <ErrorState message={NOT_FOUND_MESSAGE} />;
    return (
      <ErrorState
        message={CUSTOMER_ERROR_MESSAGE}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  return (
    <>
      <CustomerDetailCard customer={query.data} />
      <Simulator
        customerId={customerId}
        onSaved={() => {
          setHistoryPage(1);
        }}
      />
      <SimulationHistory customerId={customerId} page={historyPage} onPageChange={setHistoryPage} />
    </>
  );
}

// Detalle del cliente (RF-35). Un `:id` sin formato válido no hace petición. La `key` reinicia el
// estado (p. ej. la página del historial) al pasar de un cliente a otro.
export function CustomerDetail() {
  const customerId = parseCustomerId(useParams().id);
  return (
    <section>
      <h1>Detalle del cliente</h1>
      {customerId === undefined ? (
        <ErrorState message={NOT_FOUND_MESSAGE} />
      ) : (
        <CustomerDetailContent key={customerId} customerId={customerId} />
      )}
    </section>
  );
}
