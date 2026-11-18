import { ErrorState } from '../../shared/ErrorState.tsx';
import { LoadingState } from '../../shared/LoadingState.tsx';
import type { Currency } from './conversion.ts';
import { CURRENCIES } from './CurrencyContext.tsx';
import styles from './CurrencySelector.module.css';
import { useCurrency } from './useCurrency.ts';

const RATE_DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** `time_last_update_utc` en hora local y `es-ES` (RF-41); `undefined` si no es una fecha. */
export function formatRateDate(lastUpdateUtc: string): string | undefined {
  const date = new Date(lastUpdateUtc);
  return Number.isNaN(date.getTime()) ? undefined : RATE_DATE_FORMAT.format(date);
}

export const FX_UNAVAILABLE_MESSAGE =
  'No se han podido obtener los tipos de cambio. Los importes se muestran en EUR.';

// Selector de divisa de la cabecera con sus estados (RF-40, RF-43, CA-100 a CA-104).
export function CurrencySelector() {
  const { currency, lastUpdateUtc, isLoading, isUnavailable, setCurrency, retry } = useCurrency();
  const disabled = isLoading || isUnavailable;
  const rateDate = lastUpdateUtc === undefined ? undefined : formatRateDate(lastUpdateUtc);

  return (
    <div className={styles.selector}>
      <label className={styles.field}>
        <span>Divisa</span>
        <select
          className={styles.select}
          value={currency}
          disabled={disabled}
          onChange={(event) => {
            setCurrency(event.target.value as Currency);
          }}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      {isLoading && <LoadingState label="Cargando tipos de cambio…" />}
      {isUnavailable && <ErrorState message={FX_UNAVAILABLE_MESSAGE} onRetry={retry} />}
      {rateDate !== undefined && <p className={styles.date}>Tipos del {rateDate}</p>}
    </div>
  );
}
