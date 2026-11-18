import { Link } from 'react-router';
import type { Customer } from '../../api/types.ts';
import styles from './customers.module.css';

const regionNames = new Intl.DisplayNames('es-ES', { type: 'region' });

/** Nombre del país en `es-ES` (RF-37); si `Intl` no lo resuelve, el código tal cual. */
export function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

type Props = { customer: Customer };

// Tarjeta del listado (plan, decisión 2): los campos por los que se busca y los que identifican
// al cliente, con enlace al detalle. Todo se pinta como texto de JSX, que React escapa (RF-44).
export function CustomerCard({ customer }: Props) {
  return (
    <Link to={`/customers/${customer.id}`} className={styles.card}>
      <h2 className={styles.name}>{customer.companyName}</h2>
      <dl className={styles.fields}>
        <div className={styles.field}>
          <dt>Identificador fiscal</dt>
          <dd>{customer.taxId}</dd>
        </div>
        <div className={styles.field}>
          <dt>País</dt>
          <dd>{countryName(customer.country)}</dd>
        </div>
        <div className={styles.field}>
          <dt>Plan</dt>
          <dd>{customer.plan}</dd>
        </div>
      </dl>
    </Link>
  );
}
