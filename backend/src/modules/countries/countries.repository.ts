import type { Db } from '../../db/connection.ts';

/** País soportado con su tasa en puntos básicos (spec 4.3, 5.7). */
export interface Country {
  code: string;
  taxRateBp: number;
}

/**
 * Acceso a `tax_rates`, la fuente de verdad de los países soportados (RF-08, RF-17, RF-32).
 * Sin caché: la tabla se edita a mano y cada llamada la lee de nuevo (architecture §2).
 */
export interface TaxRatesRepository {
  /** Todos los países, ordenados por `code`. */
  listCountries(): Country[];
  /** Tasa del país, o `undefined` si el código no está en la tabla. */
  getRateBp(code: string): number | undefined;
  /** Códigos de los países soportados, ordenados. */
  listCodes(): string[];
}

interface TaxRateRow {
  country_code: string;
  rate_bp: number;
}

export function createTaxRatesRepository(db: Db): TaxRatesRepository {
  const selectAll = db.prepare<[], TaxRateRow>(
    'SELECT country_code, rate_bp FROM tax_rates ORDER BY country_code',
  );
  const selectRate = db.prepare<[string], Pick<TaxRateRow, 'rate_bp'>>(
    'SELECT rate_bp FROM tax_rates WHERE country_code = ?',
  );
  const selectCodes = db
    .prepare<[], string>('SELECT country_code FROM tax_rates ORDER BY country_code')
    .pluck();

  return {
    listCountries: () =>
      selectAll.all().map((row) => ({ code: row.country_code, taxRateBp: row.rate_bp })),
    getRateBp: (code) => selectRate.get(code)?.rate_bp,
    listCodes: () => selectCodes.all(),
  };
}
