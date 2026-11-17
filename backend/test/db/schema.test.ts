import { describe, expect, it } from 'vitest';
import {
  get,
  insertCustomer,
  insertSimulation,
  ISO_UTC,
  useTestDb,
  type Row,
} from './schemaRows.ts';

// Tabla simulations y propiedades generales de 001_init.sql, con better-sqlite3 directo
// (spec 4.1 y 4.5).

const testDb = useTestDb();

describe('tabla simulations', () => {
  it('CA-26: un UPDATE directo aborta por el trigger', () => {
    const db = testDb();
    const id = insertSimulation(db);
    expect(() => db.prepare('UPDATE simulations SET users = 20 WHERE id = ?').run(id)).toThrow(
      'simulations are immutable',
    );
    expect(get(db, 'simulations', id)['users']).toBe(15);
  });

  it('CA-26: un DELETE directo aborta por el trigger', () => {
    const db = testDb();
    const id = insertSimulation(db);
    expect(() => db.prepare('DELETE FROM simulations WHERE id = ?').run(id)).toThrow(
      'simulations are immutable',
    );
    expect(get(db, 'simulations', id)).toBeDefined();
  });

  it('CA-27: un INSERT con total_cents ≠ base + impuesto se rechaza por CHECK', () => {
    const db = testDb();
    expect(() => insertSimulation(db, { total_cents: 1694001 })).toThrow(/CHECK constraint failed/);
  });

  it('acepta los valores límite de cada rango', () => {
    const db = testDb();
    const customer_id = insertCustomer(db);
    const limits = [
      { users: 1, storage_gb: 0, api_calls_per_month: 0, tax_rate_bp: 0 },
      { users: 1000, storage_gb: 100000, api_calls_per_month: 1000000, tax_rate_bp: 10000 },
    ];
    limits.forEach((row) =>
      expect(() => insertSimulation(db, { ...row, customer_id })).not.toThrow(),
    );
  });

  it.each([
    ['users', 0],
    ['users', 1001],
    ['storage_gb', -1],
    ['storage_gb', 100001],
    ['api_calls_per_month', -1],
    ['api_calls_per_month', 1000001],
    ['tax_rate_bp', -1],
    ['tax_rate_bp', 10001],
    ['base_cents', -1],
    ['tax_cents', -1],
    ['tiers_json', 'no es json'],
  ])('rechaza %s = %j por CHECK', (column, value) => {
    const db = testDb();
    const overrides: Row = { [column]: value };
    if (column === 'base_cents' || column === 'tax_cents') {
      overrides['total_cents'] = column === 'base_cents' ? 293999 : 1399999;
    }
    expect(() => insertSimulation(db, overrides)).toThrow(/CHECK constraint failed/);
  });

  it('rechaza un customer_id que no existe (FK)', () => {
    const db = testDb();
    expect(() => insertSimulation(db, { customer_id: 999 })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('tax_rate_bp no tiene FK: guarda una tasa que no está en tax_rates', () => {
    const db = testDb();
    const id = insertSimulation(db, { tax_rate_bp: 1234 });
    expect(get(db, 'simulations', id)['tax_rate_bp']).toBe(1234);
  });

  it('STRICT rechaza un texto en una columna INTEGER', () => {
    const db = testDb();
    expect(() => insertSimulation(db, { users: 'diez' })).toThrow(/cannot store TEXT value/);
  });

  it('genera ids consecutivos y created_at en ISO 8601 UTC', () => {
    const db = testDb();
    const customerId = insertCustomer(db);
    const first = insertSimulation(db, { customer_id: customerId });
    const second = insertSimulation(db, { customer_id: customerId });
    expect(second).toBe(first + 1);
    expect(get(db, 'simulations', first)['created_at']).toMatch(ISO_UTC);
  });
});

describe('esquema', () => {
  it('las tres tablas son STRICT', () => {
    const db = testDb();
    const strict = db
      .prepare(
        "SELECT name FROM pragma_table_list WHERE strict = 1 AND name != 'schema_migrations'",
      )
      .pluck()
      .all();
    expect(strict.sort()).toEqual(['customers', 'simulations', 'tax_rates']);
  });

  it.each([
    ['customers_search_idx', ['company_name_search', 'id']],
    ['simulations_history_idx', ['customer_id', 'created_at DESC', 'id DESC']],
  ])('crea el índice %s sobre %j', (index, columns) => {
    const db = testDb();
    const keys = db
      .prepare(
        "SELECT name || iif(desc, ' DESC', '') FROM pragma_index_xinfo(?) WHERE key = 1 ORDER BY seqno",
      )
      .pluck()
      .all(index);
    expect(keys).toEqual(columns);
  });
});
