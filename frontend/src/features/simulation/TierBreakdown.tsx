import type { Tier } from '../../api/types.ts';
import { Money } from '../currency/Money.tsx';
import styles from './simulation.module.css';

const INTEGER_FORMAT = new Intl.NumberFormat('es-ES');

/** Rango de usuarios del tramo: «1–10» o, en el último tramo (`to: null`), «desde 51». */
export function tierRange(tier: Tier): string {
  const from = INTEGER_FORMAT.format(tier.from);
  return tier.to === null ? `desde ${from}` : `${from}–${INTEGER_FORMAT.format(tier.to)}`;
}

type Props = { tiers: Tier[] };

// Desplegable con el desglose por tramos (RF-35). Cada importe se convierte y se redondea por
// separado con `<Money>`, así que la suma de subtotales puede diferir de la base en una unidad
// mínima (RB-14).
export function TierBreakdown({ tiers }: Props) {
  return (
    <details className={styles.tiers}>
      <summary>Ver desglose por tramos</summary>
      <ul className={styles.tierList} aria-label="Tramos">
        {tiers.map((tier) => (
          <li key={tier.from} className={styles.tier}>
            <span className={styles.tierRange}>Usuarios {tierRange(tier)}</span>
            <dl className={styles.tierFields}>
              <div>
                <dt>Unidades</dt>
                <dd>{INTEGER_FORMAT.format(tier.units)}</dd>
              </div>
              <div>
                <dt>Precio unitario</dt>
                <dd>
                  <Money cents={tier.unitPriceCents} />
                </dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>
                  <Money cents={tier.subtotalCents} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </details>
  );
}
