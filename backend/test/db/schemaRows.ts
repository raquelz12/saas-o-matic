import { afterEach } from 'vitest';
import type { Db } from '../../src/db/connection.ts';
import { createTestDb } from '../helpers/createTestApp.ts';

// Filas válidas e inserciones directas para los tests de esquema (schema*.test.ts).

export type Row = Record<string, unknown>;

export const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const VALID_CUSTOMER: Row = {
  company_name: 'Acme SL',
  company_name_search: 'acme sl',
  tax_id: '12345678Z',
  email: 'info@acme.es',
  country_code: 'ES',
  plan: 'STARTER',
};

export const VALID_SIMULATION: Row = {
  users: 15,
  storage_gb: 0,
  api_calls_per_month: 0,
  tax_rate_bp: 2100,
  base_cents: 1400000,
  tax_cents: 294000,
  total_cents: 1694000,
  tiers_json: '[]',
};

/** Devuelve una fábrica de BD migradas y sembradas que se cierran tras cada test. */
export function useTestDb(): () => Db {
  const openDbs: Db[] = [];
  afterEach(() => {
    openDbs.splice(0).forEach((db) => db.close());
  });
  return () => {
    const db = createTestDb();
    openDbs.push(db);
    return db;
  };
}

export function insert(db: Db, table: string, row: Row): number {
  const columns = Object.keys(row);
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`;
  return Number(db.prepare(sql).run(row).lastInsertRowid);
}

export function insertCustomer(db: Db, overrides: Row = {}): number {
  return insert(db, 'customers', { ...VALID_CUSTOMER, ...overrides });
}

export function insertSimulation(db: Db, overrides: Row = {}): number {
  const customerId = overrides['customer_id'] ?? insertCustomer(db);
  return insert(db, 'simulations', { ...VALID_SIMULATION, customer_id: customerId, ...overrides });
}

export function get(db: Db, table: string, id: number): Row {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row;
}
