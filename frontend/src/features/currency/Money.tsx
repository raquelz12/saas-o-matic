import { convert, formatMoney } from './conversion.ts';
import { useCurrency } from './useCurrency.ts';

// Importe suelto (base, impuesto, subtotal de tramo) en la divisa elegida (RF-42, RB-14).
export function Money({ cents }: { cents: number }) {
  const { currency, rate } = useCurrency();
  return <span>{formatMoney(convert(cents, rate, currency), currency)}</span>;
}
