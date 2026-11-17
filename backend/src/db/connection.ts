import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

/** Conexión síncrona a SQLite (ADR-003). */
export type Db = Database.Database;

const IN_MEMORY = ':memory:';

/**
 * Abre la base de datos en `path` (o `:memory:`) con `foreign_keys` activado,
 * porque SQLite lo trae desactivado en cada conexión (spec 4.1).
 * Si la carpeta del archivo no existe, la crea.
 */
export function openDatabase(path: string): Db {
  if (path !== IN_MEMORY) {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  return db;
}
