import type { ReactNode } from 'react';
import type { Simulation } from '../../api/types.ts';
import { EmptyState } from '../../shared/EmptyState.tsx';
import { ErrorState } from '../../shared/ErrorState.tsx';
import { LoadingState } from '../../shared/LoadingState.tsx';
import { Pagination } from '../../shared/Pagination.tsx';
import { Money } from '../currency/Money.tsx';
import { MoneyTotal } from '../currency/MoneyTotal.tsx';
import styles from './simulation.module.css';
import { TierBreakdown } from './TierBreakdown.tsx';
import { useSimulationHistory } from './useSimulationHistory.ts';

export const HISTORY_EMPTY_MESSAGE = 'Todavía no hay simulaciones guardadas.';
export const HISTORY_ERROR_MESSAGE = 'No se ha podido cargar el historial.';

const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
const INTEGER_FORMAT = new Intl.NumberFormat('es-ES');
const PERCENT_FORMAT = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  maximumFractionDigits: 2,
});

/** Fecha ISO del backend en hora local y `es-ES`; si no es una fecha, el texto tal cual. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DATE_FORMAT.format(date);
}

/** Tasa en puntos básicos como porcentaje `es-ES`: 2100 → «21 %». Solo es visualización. */
export function formatRate(taxRateBp: number): string {
  return PERCENT_FORMAT.format(taxRateBp / 10000);
}

// Una simulación guardada (RF-35): fecha, consumo, importes en la divisa elegida y tasa aplicada.
function SimulationCard({ simulation }: { simulation: Simulation }) {
  const fields: [string, ReactNode][] = [
    ['Usuarios', INTEGER_FORMAT.format(simulation.users)],
    ['Almacenamiento', `${INTEGER_FORMAT.format(simulation.storageGb)} GB`],
    ['Llamadas a la API / mes', INTEGER_FORMAT.format(simulation.apiCallsPerMonth)],
    ['Base', <Money cents={simulation.baseCents} />],
    ['Impuesto', <Money cents={simulation.taxCents} />],
    ['Total', <MoneyTotal baseCents={simulation.baseCents} taxCents={simulation.taxCents} />],
    ['Tasa aplicada', formatRate(simulation.taxRateBp)],
  ];
  return (
    <article className={styles.card} aria-label={`Simulación ${simulation.id}`}>
      <h3 className={styles.date}>{formatDateTime(simulation.createdAt)}</h3>
      <dl className={styles.fields}>
        {fields.map(([label, value]) => (
          <div key={label} className={styles.field}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <TierBreakdown tiers={simulation.tiers} />
    </article>
  );
}

export interface SimulationHistoryProps {
  customerId: number;
  /** Página pedida: la guarda quien compone el historial, porque el guardado la devuelve a 1. */
  page: number;
  onPageChange: (page: number) => void;
}

// Contenido del historial según el estado de la query (RF-43).
function HistoryContent({ customerId, page: requestedPage, onPageChange }: SimulationHistoryProps) {
  const query = useSimulationHistory(customerId, requestedPage);
  if (query.isPending) return <LoadingState label="Cargando historial…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={HISTORY_ERROR_MESSAGE}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const { items, page, pageSize, total } = query.data;
  if (items.length === 0) return <EmptyState message={HISTORY_EMPTY_MESSAGE} />;

  return (
    <>
      <ul className={styles.list} aria-label="Simulaciones">
        {items.map((simulation) => (
          <li key={simulation.id}>
            <SimulationCard simulation={simulation} />
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
    </>
  );
}

// Historial paginado de simulaciones del cliente (RF-35).
export function SimulationHistory(props: SimulationHistoryProps) {
  return (
    <section className={styles.history} aria-labelledby="simulation-history-title">
      <h2 id="simulation-history-title">Historial de simulaciones</h2>
      <HistoryContent {...props} />
    </section>
  );
}
