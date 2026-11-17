import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/db/connection.ts';
import { runMigrations } from '../../src/db/migrate.ts';
import { prepareDatabase } from '../../src/db/prepareDatabase.ts';
import { seedTaxRates } from '../../src/db/seedTaxRates.ts';

const openDbs: Db[] = [];
const tempDirs: string[] = [];

function track(db: Db): Db {
  openDbs.push(db);
  return db;
}

/** BD `:memory:` con el esquema aplicado y sin tasas. */
function migratedDb(): Db {
  const db = track(openDatabase(':memory:'));
  runMigrations(db);
  return db;
}

function rates(db: Db): unknown[] {
  return db.prepare('SELECT country_code, rate_bp FROM tax_rates ORDER BY country_code').all();
}

afterEach(() => {
  openDbs.splice(0).forEach((db) => db.close());
  tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

const SEEDED_RATES = [
  { country_code: 'DE', rate_bp: 1900 },
  { country_code: 'ES', rate_bp: 2100 },
  { country_code: 'FR', rate_bp: 2000 },
  { country_code: 'GB', rate_bp: 2000 },
  { country_code: 'IT', rate_bp: 2200 },
  { country_code: 'NL', rate_bp: 2100 },
  { country_code: 'PT', rate_bp: 2300 },
];

describe('seedTaxRates', () => {
  it('carga las 7 tasas iniciales en puntos básicos (RF-32)', () => {
    const db = migratedDb();
    expect(seedTaxRates(db)).toBe(7);
    expect(rates(db)).toEqual(SEEDED_RATES);
  });

  it('una segunda ejecución no inserta nada', () => {
    const db = migratedDb();
    seedTaxRates(db);
    expect(seedTaxRates(db)).toBe(0);
    expect(rates(db)).toEqual(SEEDED_RATES);
  });

  it('no revierte una tasa editada a mano (INSERT OR IGNORE)', () => {
    const db = migratedDb();
    seedTaxRates(db);
    db.prepare("UPDATE tax_rates SET rate_bp = 1000 WHERE country_code = 'ES'").run();
    seedTaxRates(db);
    expect(
      db.prepare("SELECT rate_bp FROM tax_rates WHERE country_code = 'ES'").pluck().get(),
    ).toBe(1000);
  });

  it('repone una tasa borrada a mano sin tocar las demás', () => {
    const db = migratedDb();
    seedTaxRates(db);
    db.prepare("UPDATE tax_rates SET rate_bp = 1000 WHERE country_code = 'FR'").run();
    db.prepare("DELETE FROM tax_rates WHERE country_code = 'ES'").run();
    expect(seedTaxRates(db)).toBe(1);
    expect(
      db.prepare("SELECT rate_bp FROM tax_rates WHERE country_code = 'FR'").pluck().get(),
    ).toBe(1000);
  });

  it('sin migrar, lanza el error de SQLite', () => {
    const db = track(openDatabase(':memory:'));
    expect(() => seedTaxRates(db)).toThrow(/no such table: tax_rates/);
  });
});

describe('prepareDatabase (arranque del servidor, R-71)', () => {
  it('sobre un archivo que no existe deja migraciones y tasas aplicadas', () => {
    const dir = mkdtempSync(join(tmpdir(), 'saas-o-matic-'));
    tempDirs.push(dir);
    const path = join(dir, 'data', 'app.db');

    const db = track(prepareDatabase(path));

    expect(existsSync(path)).toBe(true);
    expect(db.prepare('SELECT name FROM schema_migrations').pluck().all()).toEqual([
      '001_init.sql',
    ]);
    expect(rates(db)).toEqual(SEEDED_RATES);
  });

  it('al rearrancar no aplica nada nuevo ni revierte tasas editadas', () => {
    const dir = mkdtempSync(join(tmpdir(), 'saas-o-matic-'));
    tempDirs.push(dir);
    const path = join(dir, 'app.db');
    const first = prepareDatabase(path);
    first.prepare("UPDATE tax_rates SET rate_bp = 1000 WHERE country_code = 'ES'").run();
    first.close();

    const db = track(prepareDatabase(path));

    expect(runMigrations(db)).toEqual([]);
    expect(
      db.prepare("SELECT rate_bp FROM tax_rates WHERE country_code = 'ES'").pluck().get(),
    ).toBe(1000);
  });
});
