import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../src/db/connection.ts';
import { DEMO_CUSTOMERS, seedDemoCustomers } from '../../src/db/seedDemo.ts';
import { createCustomersRepository } from '../../src/modules/customers/customers.repository.ts';
import { createCustomersService } from '../../src/modules/customers/customers.service.ts';
import { createTestDb, silentLogger } from '../helpers/createTestApp.ts';

// Seed de clientes demo (plan T-34; fuera de la spec, R-93).

const openDbs: Db[] = [];

function testDb(): Db {
  const db = createTestDb();
  openDbs.push(db);
  return db;
}

function count(db: Db, table: 'customers' | 'simulations'): unknown {
  return db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get();
}

function spyLogger() {
  return { ...silentLogger, info: vi.fn() };
}

afterEach(() => {
  openDbs.splice(0).forEach((db) => db.close());
});

describe('seedDemoCustomers', () => {
  it('sobre una BD vacía crea los 10 clientes y lo indica', () => {
    const db = testDb();
    const log = spyLogger();

    expect(seedDemoCustomers(db, log)).toBe(10);

    expect(count(db, 'customers')).toBe(DEMO_CUSTOMERS.length);
    expect(log.info).toHaveBeenCalledWith('Demo customers inserted: 10');
  });

  it('dos ejecuciones dejan el mismo número de filas y la segunda lo indica (R-91)', () => {
    const db = testDb();
    seedDemoCustomers(db, silentLogger);
    const log = spyLogger();

    expect(seedDemoCustomers(db, log)).toBe(0);

    expect(count(db, 'customers')).toBe(10);
    expect(log.info).toHaveBeenCalledWith('Demo seed skipped: 10 customers already exist');
  });

  it('si ya hay algún cliente, no inserta nada', () => {
    const db = testDb();
    createCustomersService(createCustomersRepository(db)).create({
      companyName: 'Acme SL',
      taxId: 'B12345674',
      email: 'compras@acme.es',
      country: 'ES',
      plan: 'STARTER',
    });

    expect(seedDemoCustomers(db, silentLogger)).toBe(0);
    expect(count(db, 'customers')).toBe(1);
  });

  it('pasa por la normalización del alta (spec 3.3)', () => {
    const db = testDb();
    seedDemoCustomers(db, silentLogger);

    const row = db
      .prepare(
        'SELECT company_name, tax_id, email, country_code, plan FROM customers WHERE tax_id = ?',
      )
      .get('B12345674');
    expect(row).toEqual({
      company_name: 'Construcciones Álvarez SL',
      tax_id: 'B12345674',
      email: 'facturacion@alvarez.example.com',
      country_code: 'ES',
      plan: 'BUSINESS',
    });
  });

  it('cubre los 7 países y los 3 planes', () => {
    const db = testDb();
    seedDemoCustomers(db, silentLogger);

    const distinct = (column: string) =>
      db.prepare(`SELECT DISTINCT ${column} FROM customers ORDER BY 1`).pluck().all();
    expect(distinct('country_code')).toEqual(['DE', 'ES', 'FR', 'GB', 'IT', 'NL', 'PT']);
    expect(distinct('plan')).toEqual(['BUSINESS', 'ENTERPRISE', 'STARTER']);
  });

  it('solo crea clientes, sin simulaciones (decisión 3 del plan)', () => {
    const db = testDb();
    seedDemoCustomers(db, silentLogger);
    expect(count(db, 'simulations')).toBe(0);
  });

  it('createTestDb nunca lo ejecuta (architecture §6)', () => {
    expect(count(testDb(), 'customers')).toBe(0);
  });
});
