import type { Customer } from '../../api/types.ts';
import { countryName } from './CustomerCard.tsx';
import styles from './CustomerDetailCard.module.css';
import { PLAN_LABELS } from './plans.ts';

const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

/** Fecha ISO del backend en hora local y `es-ES`; si no es una fecha, el texto tal cual. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DATE_FORMAT.format(date);
}

type Props = { customer: Customer };

// Tarjeta de datos del cliente en el detalle (RF-35). Todo se pinta como texto de JSX, que React
// escapa (RF-44, CA-105).
export function CustomerDetailCard({ customer }: Props) {
  const fields: [string, string][] = [
    ['Identificador fiscal', customer.taxId],
    ['Email', customer.email],
    ['País', countryName(customer.country)],
    ['Plan', PLAN_LABELS[customer.plan]],
    ['Fecha de alta', formatDateTime(customer.createdAt)],
  ];
  return (
    <article className={styles.card} aria-label="Datos del cliente">
      <h2 className={styles.name}>{customer.companyName}</h2>
      <dl className={styles.fields}>
        {fields.map(([label, value]) => (
          <div key={label} className={styles.field}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
