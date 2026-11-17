import Database from 'better-sqlite3';
import type { Db } from '../../db/connection.ts';
import { DuplicateError } from '../../shared/errors.ts';

/** Recurso `Customer` (spec 5.2). `company_name_search` es interno y no aparece. */
export interface Customer {
  id: number;
  companyName: string;
  taxId: string;
  email: string;
  country: string;
  /** El CHECK de la tabla garantiza que es uno de los planes de RF-09. */
  plan: string;
  createdAt: string;
}

/** Valores ya normalizados para insertar, con la clave de búsqueda calculada (spec 4.4). */
export interface CustomerDraft {
  companyName: string;
  companyNameSearch: string;
  taxId: string;
  email: string;
  country: string;
  plan: string;
}

export interface CustomersRepository {
  /**
   * Inserta el cliente y lo devuelve con `id` y `createdAt` generados por la BD.
   * Si el par (país, identificador) ya existe → `DuplicateError('taxId')`.
   */
  insert(draft: CustomerDraft): Customer;
  /** Cliente con ese `id`, o `undefined` si no existe (RF-16). */
  findById(id: number): Customer | undefined;
}

interface CustomerRow {
  id: number;
  company_name: string;
  tax_id: string;
  email: string;
  country_code: string;
  plan: string;
  created_at: string;
}

const UNIQUE_VIOLATION = 'SQLITE_CONSTRAINT_UNIQUE';

const COLUMNS = 'id, company_name, tax_id, email, country_code, plan, created_at';

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    companyName: row.company_name,
    taxId: row.tax_id,
    email: row.email,
    country: row.country_code,
    plan: row.plan,
    createdAt: row.created_at,
  };
}

/**
 * La única restricción `UNIQUE` de `customers` es (country_code, tax_id): la PK da
 * `SQLITE_CONSTRAINT_PRIMARYKEY`. Se traduce sin SELECT previo, así que también cubre
 * la carrera entre dos altas simultáneas (spec 4.4, architecture §5).
 */
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Database.SqliteError && err.code === UNIQUE_VIOLATION;
}

export function createCustomersRepository(db: Db): CustomersRepository {
  const insertCustomer = db.prepare<[CustomerDraft], CustomerRow>(
    `INSERT INTO customers (company_name, company_name_search, tax_id, email, country_code, plan)
     VALUES (@companyName, @companyNameSearch, @taxId, @email, @country, @plan)
     RETURNING ${COLUMNS}`,
  );
  const selectById = db.prepare<[number], CustomerRow>(
    `SELECT ${COLUMNS} FROM customers WHERE id = ?`,
  );

  return {
    insert: (draft) => {
      try {
        const row = insertCustomer.get(draft);
        if (row === undefined) throw new Error('INSERT … RETURNING returned no row');
        return toCustomer(row);
      } catch (err) {
        if (isUniqueViolation(err)) throw new DuplicateError('taxId');
        throw err;
      }
    },
    findById: (id) => {
      const row = selectById.get(id);
      return row === undefined ? undefined : toCustomer(row);
    },
  };
}
