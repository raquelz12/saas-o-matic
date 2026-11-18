import type { ReactNode } from 'react';
import type { SimulationPreview } from '../../api/types.ts';
import { ErrorState } from '../../shared/ErrorState.tsx';
import { LoadingState } from '../../shared/LoadingState.tsx';
import { Money } from '../currency/Money.tsx';
import { MoneyTotal } from '../currency/MoneyTotal.tsx';
import styles from './simulation.module.css';
import { TierBreakdown } from './TierBreakdown.tsx';
import type { PreviewState } from './usePreview.ts';

export const PROJECTION_LOADING_MESSAGE = 'Calculando proyección…';
export const PROJECTION_ERROR_MESSAGE = 'No se ha podido calcular la proyección.';
export const PROJECTION_STALE_MESSAGE =
  'No se ha podido actualizar la proyección. Se muestra la última calculada.';

// Base, impuesto y total en la divisa elegida y desglose por tramos (RF-38, CA-92). Cada importe
// se convierte por separado y el total es la suma de los redondeados (RF-42, RB-14).
function ProjectionCard({ projection }: { projection: SimulationPreview }) {
  const fields: [string, ReactNode][] = [
    ['Base', <Money cents={projection.baseCents} />],
    ['Impuesto', <Money cents={projection.taxCents} />],
    ['Total', <MoneyTotal baseCents={projection.baseCents} taxCents={projection.taxCents} />],
  ];
  return (
    <article className={styles.card} aria-label="Proyección">
      <dl className={styles.fields}>
        {fields.map(([label, value]) => (
          <div key={label} className={styles.field}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <TierBreakdown tiers={projection.tiers} />
    </article>
  );
}

// Proyección según el estado del preview (RF-43): si falla con una proyección previa, esta se
// mantiene con un aviso; el reintento es siempre manual.
export function Projection({ preview }: { preview: PreviewState }) {
  const { projection, isLoading, isError, retry } = preview;
  if (isLoading) return <LoadingState label={PROJECTION_LOADING_MESSAGE} />;
  if (projection === undefined) {
    return <ErrorState message={PROJECTION_ERROR_MESSAGE} onRetry={retry} />;
  }
  return (
    <>
      {isError && <ErrorState message={PROJECTION_STALE_MESSAGE} onRetry={retry} />}
      <ProjectionCard projection={projection} />
    </>
  );
}
