import { useContext } from 'react';
import { CurrencyContext, type CurrencyContextValue } from './CurrencyContext.tsx';

/** Divisa y tipos de cambio de la aplicación. Superficie pública de `currency` (architecture §3). */
export function useCurrency(): CurrencyContextValue {
  const value = useContext(CurrencyContext);
  if (value === undefined) {
    throw new Error('useCurrency debe usarse dentro de <CurrencyProvider>');
  }
  return value;
}
