import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config/env.ts';
import { logger } from '../shared/logger.ts';
import { openDatabase, type Db } from './connection.ts';

/** Carpeta de las migraciones reales (architecture §1). */
export const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'migrations');

/** Solo cuentan los archivos `NNN_nombre.sql`; el resto se ignora. */
const MIGRATION_FILE = /^(\d+)_.+\.sql$/;

interface MigrationFile {
  number: number;
  name: string;
}

function listMigrations(dir: string): MigrationFile[] {
  if (!existsSync(dir)) {
    throw new Error(`Migrations directory not found: ${dir}`);
  }
  const files: MigrationFile[] = [];
  for (const name of readdirSync(dir)) {
    const match = MIGRATION_FILE.exec(name);
    if (match?.[1] !== undefined) files.push({ number: Number(match[1]), name });
  }
  files.sort((a, b) => a.number - b.number);
  files.forEach((file, i) => {
    const previous = files[i - 1];
    if (previous?.number === file.number) {
      throw new Error(`Duplicate migration number ${file.number}: ${previous.name}, ${file.name}`);
    }
  });
  return files;
}

/**
 * Aplica, en orden numérico, las migraciones de `dir` que aún no constan en
 * `schema_migrations` y devuelve sus nombres. Es idempotente: una segunda
 * ejecución no aplica nada (spec 4.7, ADR-003).
 * Cada migración y su registro van en la misma transacción, así que una
 * migración que falla no deja cambios a medias. Por eso los scripts no deben
 * abrir ni cerrar transacciones propias.
 */
export function runMigrations(db: Db, dir: string = MIGRATIONS_DIR): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  ) STRICT`);

  const appliedRows = db.prepare('SELECT name FROM schema_migrations').pluck().all();
  const applied = new Set(appliedRows);
  const record = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');
  const pending = listMigrations(dir).filter((file) => !applied.has(file.name));

  for (const file of pending) {
    const sql = readFileSync(join(dir, file.name), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      record.run(file.name);
    })();
  }
  return pending.map((file) => file.name);
}

// `npm run db:migrate`: migración explícita sobre la BD de `DB_PATH` (spec 4.7).
if (import.meta.main) {
  const db = openDatabase(loadConfig().dbPath);
  try {
    const applied = runMigrations(db);
    logger.info(
      applied.length > 0 ? `Applied migrations: ${applied.join(', ')}` : 'No pending migrations',
    );
  } finally {
    db.close();
  }
}
