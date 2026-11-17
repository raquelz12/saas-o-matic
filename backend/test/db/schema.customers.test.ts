import { describe, expect, it } from 'vitest';
import { insert, insertCustomer, ISO_UTC, get, useTestDb, type Row } from './schemaRows.ts';

// Tablas customers y tax_rates de 001_init.sql, con better-sqlite3 directo (spec 4.3 y 4.4).

const testDb = useTestDb();

describe('tabla customers', () => {
  it('un UPDATE directo aborta por el trigger (RF-10)', () => {
    const db = testDb();
    const id = insertCustomer(db);
    expect(() => db.prepare("UPDATE customers SET email = 'x@y.es' WHERE id = ?").run(id)).toThrow(
      'customers are immutable',
    );
  });

  it('un DELETE directo aborta por el trigger (RF-10)', () => {
    const db = testDb();
    const id = insertCustomer(db);
    expect(() => db.prepare('DELETE FROM customers WHERE id = ?').run(id)).toThrow(
      'customers are immutable',
    );
  });

  it('rechaza un country_code que no está en tax_rates (FK)', () => {
    const db = testDb();
    expect(() => insertCustomer(db, { country_code: 'US' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('rechaza el mismo tax_id en el mismo país con SQLITE_CONSTRAINT_UNIQUE', () => {
    const db = testDb();
    insertCustomer(db);
    expect(() => insertCustomer(db, { email: 'otro@acme.es' })).toThrow(
      expect.objectContaining({ code: 'SQLITE_CONSTRAINT_UNIQUE' }),
    );
  });

  it('acepta el mismo tax_id en otro país', () => {
    const db = testDb();
    insertCustomer(db);
    expect(() => insertCustomer(db, { country_code: 'FR' })).not.toThrow();
  });

  it.each([
    ['company_name', 'A'],
    ['company_name', 'A'.repeat(101)],
    ['tax_id', '1234'],
    ['tax_id', '1'.repeat(21)],
    ['email', `${'a'.repeat(245)}@acme.es.x`],
    ['plan', 'FREE'],
  ])('rechaza %s = %j por CHECK', (column, value) => {
    const db = testDb();
    expect(() => insertCustomer(db, { [column]: value })).toThrow(/CHECK constraint failed/);
  });

  it('genera created_at en ISO 8601 UTC', () => {
    const db = testDb();
    expect(get(db, 'customers', insertCustomer(db))['created_at']).toMatch(ISO_UTC);
  });
});

describe('tabla tax_rates', () => {
  it.each([
    ['country_code', 'es'],
    ['country_code', 'ESP'],
    ['rate_bp', -1],
    ['rate_bp', 10001],
  ])('rechaza %s = %j por CHECK', (column, value) => {
    const db = testDb();
    const row: Row = { country_code: 'BE', rate_bp: 2100, [column]: value };
    expect(() => insert(db, 'tax_rates', row)).toThrow(/CHECK constraint failed/);
  });

  it('se puede editar a mano: no tiene triggers', () => {
    const db = testDb();
    const update = db.prepare("UPDATE tax_rates SET rate_bp = 2200 WHERE country_code = 'ES'");
    expect(update.run().changes).toBe(1);
  });
});
