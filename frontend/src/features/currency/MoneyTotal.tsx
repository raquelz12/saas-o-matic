import { convert, formatMoney } from './conversion.ts';
import { useCurrency } from './useCurrency.ts';

type Props = { baseCents: number; taxCents: number };

// Total como suma de la base y el impuesto ya convertidos y redondeados; nunca se convierte el
// total directamente (RF-42, RB-14, CA-97).
export function MoneyTotal({ baseCents, taxCents }: Props) {
  const { currency, rate } = useCurrency();
  const total = convert(baseCents, rate, currency).plus(convert(taxCents, rate, currency));
  return <span>{formatMoney(total, currency)}</span>;
}
