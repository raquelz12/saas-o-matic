import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Currency } from './conversion.ts';
import { useFxRates } from './useFxRates.ts';

export const CURRENCIES: readonly Currency[] = ['EUR', 'USD', 'GBP', 'JPY'];
export const CURRENCY_STORAGE_KEY = 'saas-o-matic.currency';
const DEFAULT_CURRENCY: Currency = 'EUR';

export interface CurrencyContextValue {
  /** Divisa elegida por el usuario y guardada en `localStorage` (RF-40). */
  selected: Currency;
  /** Divisa con la que se pintan los importes: EUR si no hay tipos (RB-16). */
  currency: Currency;
  /** Tipo de `currency` (1 EUR = rate). En EUR vale 1, que no necesita conversión (RB-16). */
  rate: number;
  /** `time_last_update_utc` de los tipos en uso (RF-41). */
  lastUpdateUtc: string | undefined;
  /** Cargando sin tipos en caché (CA-100). */
  isLoading: boolean;
  /** Fallo sin tipos en caché (CA-101). Si hay caché, se siguen usando (RF-43). */
  isUnavailable: boolean;
  setCurrency: (currency: Currency) => void;
  /** Reintento manual (RF-43). */
  retry: () => void;
}

export const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

/** Lee la divisa guardada. Si `localStorage` falla o el valor no es válido, EUR (RF-40). */
function readStoredCurrency(): Currency {
  try {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isCurrency(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

function storeCurrency(currency: Currency): void {
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Sin persistencia: la elección vale hasta recargar.
  }
}

// Elección de divisa y tipos de cambio para toda la aplicación (RF-40, RF-41, architecture §3).
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Currency>(readStoredCurrency);
  const fx = useFxRates();
  const { refetch } = fx;

  const setCurrency = useCallback((currency: Currency) => {
    setSelected(currency);
    storeCurrency(currency);
  }, []);
  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const data = fx.data;
  const currency = data === undefined ? DEFAULT_CURRENCY : selected;
  const value = useMemo<CurrencyContextValue>(
    () => ({
      selected,
      currency,
      rate: data === undefined || currency === 'EUR' ? 1 : data.rates[currency],
      lastUpdateUtc: data?.lastUpdateUtc,
      isLoading: data === undefined && fx.isFetching,
      isUnavailable: data === undefined && fx.isError && !fx.isFetching,
      setCurrency,
      retry,
    }),
    [selected, currency, data, fx.isFetching, fx.isError, setCurrency, retry],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
