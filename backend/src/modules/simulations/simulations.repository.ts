import type { Db } from '../../db/connection.ts';
import type { Tier } from './domain/pricing.ts';

/** Datos de una simulación ya calculada, listos para persistir (spec 4.5, RF-24). */
export interface SimulationDraft {
  customerId: number;
  users: number;
  storageGb: number;
  apiCallsPerMonth: number;
  /** Snapshot de la tasa aplicada (RB-09). */
  taxRateBp: number;
  baseCents: number;
  taxCents: number;
  totalCents: number;
  /** Snapshot del desglose por tramos (RB-09). */
  tiers: Tier[];
}

/** Recurso `Simulation` (spec 5.2) sin `currency`, que añade el controller. */
export interface Simulation extends SimulationDraft {
  id: number;
  createdAt: string;
}

export interface SimulationsRepository {
  /** Inserta la simulación y la devuelve con `id` y `createdAt` generados por la BD. */
  insert(draft: SimulationDraft): Simulation;
}

interface SimulationRow {
  id: number;
  customer_id: number;
  users: number;
  storage_gb: number;
  api_calls_per_month: number;
  tax_rate_bp: number;
  base_cents: number;
  tax_cents: number;
  total_cents: number;
  tiers_json: string;
  created_at: string;
}

/** Parámetros con nombre del INSERT: el draft con los tramos ya serializados. */
type InsertParams = Omit<SimulationDraft, 'tiers'> & { tiersJson: string };

const COLUMNS = `id, customer_id, users, storage_gb, api_calls_per_month, tax_rate_bp,
  base_cents, tax_cents, total_cents, tiers_json, created_at`;

/**
 * `tiers_json` lo escribe solo este repositorio con `JSON.stringify` de `Tier[]` y el
 * `CHECK (json_valid(...))` garantiza que es JSON; se devuelve tal cual, sin recalcular (RB-09).
 */
function toSimulation(row: SimulationRow): Simulation {
  return {
    id: row.id,
    customerId: row.customer_id,
    users: row.users,
    storageGb: row.storage_gb,
    apiCallsPerMonth: row.api_calls_per_month,
    taxRateBp: row.tax_rate_bp,
    baseCents: row.base_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    tiers: JSON.parse(row.tiers_json) as Tier[],
    createdAt: row.created_at,
  };
}

export function createSimulationsRepository(db: Db): SimulationsRepository {
  const insertSimulation = db.prepare<[InsertParams], SimulationRow>(
    `INSERT INTO simulations (customer_id, users, storage_gb, api_calls_per_month, tax_rate_bp,
       base_cents, tax_cents, total_cents, tiers_json)
     VALUES (@customerId, @users, @storageGb, @apiCallsPerMonth, @taxRateBp,
       @baseCents, @taxCents, @totalCents, @tiersJson)
     RETURNING ${COLUMNS}`,
  );

  return {
    // Un error de BD (CHECK, FK, trigger) es un bug: se propaga y da 500 (architecture §5).
    insert: ({ tiers, ...fields }) => {
      const row = insertSimulation.get({ ...fields, tiersJson: JSON.stringify(tiers) });
      if (row === undefined) throw new Error('INSERT … RETURNING returned no row');
      return toSimulation(row);
    },
  };
}
