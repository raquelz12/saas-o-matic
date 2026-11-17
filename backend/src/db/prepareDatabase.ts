import { openDatabase, type Db } from './connection.ts';
import { runMigrations } from './migrate.ts';
import { seedTaxRates } from './seedTaxRates.ts';

/**
 * Abre la BD de `path` (o `:memory:`), aplica las migraciones pendientes y el
 * seed de `tax_rates`, para que la aplicación funcione sin pasos manuales
 * (spec 4.7, R-71). Si algo falla, cierra la conexión y relanza el error.
 */
export function prepareDatabase(path: string): Db {
  const db = openDatabase(path);
  try {
    runMigrations(db);
    seedTaxRates(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
