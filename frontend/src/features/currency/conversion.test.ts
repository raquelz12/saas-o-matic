import { describe, expect, it } from 'vitest';
import { convert, formatMoney, fractionDigits, type Currency } from './conversion.ts';

/** Salida esperada: la de `Intl` en `es-ES`, nunca un literal (plan T-26). */
function intlEsES(value: string, currency: Currency): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(value as Intl.StringNumericLiteral);
}

/** Base 140,00 € e impuesto 29,40 € (RB-15: u = 15, ES). */
const BASE_CENTS = 14_000;
const TAX_CENTS = 2_940;

describe('fractionDigits', () => {
  it('JPY no tiene decimales; EUR, USD y GBP tienen 2', () => {
    expect(fractionDigits('JPY')).toBe(0);
    expect(fractionDigits('EUR')).toBe(2);
    expect(fractionDigits('USD')).toBe(2);
    expect(fractionDigits('GBP')).toBe(2);
  });
});

describe('convert', () => {
  it('CA-97: JPY 162,37 → 22.732 + 4774 = 27.506', () => {
    const base = convert(BASE_CENTS, 162.37, 'JPY');
    const tax = convert(TAX_CENTS, 162.37, 'JPY');
    const total = base.plus(tax);

    expect(base.toFixed(0)).toBe('22732');
    expect(tax.toFixed(0)).toBe('4774');
    expect(total.toFixed(0)).toBe('27506');
    expect(formatMoney(base, 'JPY')).toBe(intlEsES('22732', 'JPY'));
    expect(formatMoney(tax, 'JPY')).toBe(intlEsES('4774', 'JPY'));
    expect(formatMoney(total, 'JPY')).toBe(intlEsES('27506', 'JPY'));
  });

  it('CA-97: el total convertido directamente sería 27.505 (diferencia aceptada, RB-14)', () => {
    expect(convert(BASE_CENTS + TAX_CENTS, 162.37, 'JPY').toFixed(0)).toBe('27505');
  });

  it('CA-98: USD 1,0850 → 151,90 + 31,90 = 183,80', () => {
    const base = convert(BASE_CENTS, 1.085, 'USD');
    const tax = convert(TAX_CENTS, 1.085, 'USD');
    const total = base.plus(tax);

    expect(base.toFixed(2)).toBe('151.90');
    expect(tax.toFixed(2)).toBe('31.90');
    expect(total.toFixed(2)).toBe('183.80');
    expect(formatMoney(base, 'USD')).toBe(intlEsES('151.90', 'USD'));
    expect(formatMoney(tax, 'USD')).toBe(intlEsES('31.90', 'USD'));
    expect(formatMoney(total, 'USD')).toBe(intlEsES('183.80', 'USD'));
  });

  it('RB-15: GBP 0,8650 → 121,10 + 25,43 = 146,53', () => {
    const base = convert(BASE_CENTS, 0.865, 'GBP');
    const tax = convert(TAX_CENTS, 0.865, 'GBP');
    const total = base.plus(tax);

    expect(base.toFixed(2)).toBe('121.10');
    expect(tax.toFixed(2)).toBe('25.43');
    expect(total.toFixed(2)).toBe('146.53');
    expect(formatMoney(total, 'GBP')).toBe(intlEsES('146.53', 'GBP'));
  });

  it('RB-15: EUR con tipo 1 → 140,00 + 29,40 = 169,40', () => {
    const base = convert(BASE_CENTS, 1, 'EUR');
    const tax = convert(TAX_CENTS, 1, 'EUR');

    expect(base.plus(tax).toFixed(2)).toBe('169.40');
    expect(formatMoney(base, 'EUR')).toBe(intlEsES('140.00', 'EUR'));
    expect(formatMoney(base.plus(tax), 'EUR')).toBe(intlEsES('169.40', 'EUR'));
  });

  it('1.005 redondea half-up a 1,01 (Math.round sobre floats daría 1,00, RF-42)', () => {
    const amount = convert(100, 1.005, 'USD');

    expect(amount.toFixed(2)).toBe('1.01');
    expect(formatMoney(amount, 'USD')).toBe(intlEsES('1.01', 'USD'));
  });

  it('half-up sin decimales en JPY: x,5 sube y x,4999 baja', () => {
    expect(convert(100, 162.5, 'JPY').toFixed(0)).toBe('163');
    expect(convert(100, 162.4999, 'JPY').toFixed(0)).toBe('162');
  });
});

describe('formatMoney', () => {
  it('usa el locale es-ES con símbolo estrecho y los decimales de la divisa', () => {
    const amount = convert(BASE_CENTS, 1, 'EUR');

    expect(formatMoney(amount, 'EUR')).toBe(intlEsES('140.00', 'EUR'));
    expect(formatMoney(convert(0, 162.37, 'JPY'), 'JPY')).toBe(intlEsES('0', 'JPY'));
  });
});
