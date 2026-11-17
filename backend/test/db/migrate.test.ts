import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/db/connection.ts';
import { runMigrations } from '../../src/db/migrate.ts';
import { createTestDb } from '../helpers/createTestApp.ts';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const ORDERED = join(FIXTURES, 'ordered');

const openDbs: Db[] = [];
const tempDirs: string[] = [];

function testDb(): Db {
  const db = createTestDb();
  openDbs.push(db);
  return db;
}

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'saas-o-matic-'));
  tempDirs.push(dir);
  return dir;
}

function appliedNames(db: Db): unknown[] {
  return db.prepare('SELECT name FROM schema_migrations ORDER BY rowid').pluck().all();
}

function tableExists(db: Db, name: string): boolean {
  const sql = "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name = ?";
  return db.prepare(sql).pluck().get(name) === 1;
}

afterEach(() => {
  // Se cierran antes de borrar: en Windows no se puede borrar un archivo abierto.
  openDbs.splice(0).forEach((db) => db.close());
  tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

describe('openDatabase', () => {
  it('activa foreign_keys en una conexión :memory:', () => {
    expect(testDb().pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('activa foreign_keys en cada conexión a un archivo, y crea su carpeta', () => {
    const path = join(tempDir(), 'nested', 'dir', 'test.db');
    const first = openDatabase(path);
    const second = openDatabase(path);
    openDbs.push(first, second);

    expect(first.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(second.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('hace cumplir las claves foráneas', () => {
    const db = testDb();
    runMigrations(db, ORDERED);

    const orphan = db.prepare('INSERT INTO notes (account_id, body) VALUES (?, ?)');
    expect(() => orphan.run(999, 'orphan')).toThrow(/FOREIGN KEY/);
  });
});

describe('runMigrations', () => {
  it('aplica las migraciones en orden numérico, no alfabético, y las registra', () => {
    const db = testDb();

    const applied = runMigrations(db, ORDERED);

    const expected = ['1_create_accounts.sql', '2_create_notes.sql', '10_insert_rows.sql'];
    expect(applied).toEqual(expected);
    expect(appliedNames(db)).toEqual(expected);
    expect(db.prepare('SELECT count(*) FROM notes').pluck().get()).toBe(1);
  });

  it('registra la fecha de aplicación en ISO 8601 UTC', () => {
    const db = testDb();
    runMigrations(db, ORDERED);

    const dates = db.prepare('SELECT applied_at FROM schema_migrations').pluck().all();
    for (const date of dates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });

  it('ignora los archivos que no son NNN_nombre.sql', () => {
    const applied = runMigrations(testDb(), ORDERED);
    expect(applied).not.toContain('README.txt');
  });

  it('una segunda ejecución no hace nada', () => {
    const db = testDb();
    runMigrations(db, ORDERED);

    expect(runMigrations(db, ORDERED)).toEqual([]);
    expect(appliedNames(db)).toHaveLength(3);
    expect(db.prepare('SELECT count(*) FROM notes').pluck().get()).toBe(1);
  });

  it('solo aplica las migraciones nuevas', () => {
    const dir = tempDir();
    copyFileSync(join(ORDERED, '1_create_accounts.sql'), join(dir, '1_create_accounts.sql'));
    const db = testDb();
    runMigrations(db, dir);

    writeFileSync(join(dir, '2_add_account.sql'), "INSERT INTO accounts (name) VALUES ('new');");

    expect(runMigrations(db, dir)).toEqual(['2_add_account.sql']);
    expect(db.prepare('SELECT count(*) FROM accounts').pluck().get()).toBe(1);
  });

  it('una migración que falla se revierte entera y no se registra', () => {
    const db = testDb();

    expect(() => runMigrations(db, join(FIXTURES, 'failing'))).toThrow(/missing_table/);

    expect(appliedNames(db)).toEqual(['001_create_ok.sql']);
    expect(tableExists(db, 'ok_table')).toBe(true);
    expect(tableExists(db, 'half_done')).toBe(false);
  });

  it('dos migraciones con el mismo número lanzan un error sin aplicar ninguna', () => {
    const db = testDb();

    expect(() => runMigrations(db, join(FIXTURES, 'duplicate'))).toThrow(/Duplicate migration/);
    expect(appliedNames(db)).toEqual([]);
  });

  it('lanza un error claro si la carpeta no existe', () => {
    const missing = join(tempDir(), 'missing');
    expect(() => runMigrations(testDb(), missing)).toThrow(/Migrations directory not found/);
  });
});
