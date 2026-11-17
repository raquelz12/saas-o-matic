import { loadConfig } from '../config/env.ts';
import { logger } from '../shared/logger.ts';
import { openDatabase, type Db } from './connection.ts';

/** Tasas iniciales en puntos básicos (RF-32, spec 4.3). */
const INITIAL_TAX_RATES: readonly { countryCode: string; rateBp: number }[] = [
  { countryCode: 'ES', rateBp: 2100 },
  { countryCode: 'FR', rateBp: 2000 },
  { countryCode: 'DE', rateBp: 1900 },
  { countryCode: 'IT', rateBp: 2200 },
  { countryCode: 'PT', rateBp: 2300 },
  { countryCode: 'NL', rateBp: 2100 },
  { countryCode: 'GB', rateBp: 2000 },
];

/**
 * Carga las tasas iniciales con `INSERT OR IGNORE`, de modo que nunca revierte
 * una tasa editada a mano (spec 4.7). Devuelve cuántas filas ha insertado.
 * Necesita la BD migrada: sin la tabla `tax_rates`, lanza el error de SQLite.
 */
export function seedTaxRates(db: Db): number {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO tax_rates (country_code, rate_bp) VALUES (?, ?)',
  );
  return db.transaction(() =>
    INITIAL_TAX_RATES.reduce(
      (inserted, rate) => inserted + insert.run(rate.countryCode, rate.rateBp).changes,
      0,
    ),
  )();
}

// `npm run db:seed`: seed explícito sobre la BD de `DB_PATH` (spec 4.7).
if (import.meta.main) {
  const db = openDatabase(loadConfig().dbPath);
  try {
    logger.info(`Seeded tax rates: ${seedTaxRates(db)} inserted`);
  } finally {
    db.close();
  }
}
