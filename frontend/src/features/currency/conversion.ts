import Big from 'big.js';

/** Divisas de visualización (RF-40). EUR es la base y no necesita tipo de cambio. */
export type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY';

const LOCALE = 'es-ES';

const formatters = new Map<Currency, Intl.NumberFormat>();

/** Formateador `es-ES` por divisa, con símbolo estrecho (`$`, `¥`, `£`, `€`). */
function formatterFor(currency: Currency): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/** Decimales de la divisa según `Intl.NumberFormat` (JPY: 0; resto: 2). */
export function fractionDigits(currency: Currency): number {
  return formatterFor(currency).resolvedOptions().maximumFractionDigits ?? 0;
}

/**
 * Convierte céntimos de EUR a la divisa con tipo `rate` (1 EUR = rate D) y
 * redondea half-up a sus decimales (RB-14). La aritmética es decimal exacta
 * con big.js, nunca `Math.round` sobre floats (RF-42).
 * El total se obtiene sumando base e impuesto ya convertidos, nunca convirtiéndolo.
 */
export function convert(cents: number, rate: number, currency: Currency): Big {
  return new Big(cents).div(100).times(rate).round(fractionDigits(currency), Big.roundHalfUp);
}

/** Formatea un importe ya convertido en `es-ES`, sin pasar por `number`. */
export function formatMoney(amount: Big, currency: Currency): string {
  const decimal = amount.toFixed(fractionDigits(currency)) as Intl.StringNumericLiteral;
  return formatterFor(currency).format(decimal);
}
