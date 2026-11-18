import { loadConfig } from '../config/env.ts';
import { createTaxRatesRepository } from '../modules/countries/countries.repository.ts';
import { createCustomersRepository } from '../modules/customers/customers.repository.ts';
import { buildCreateCustomerSchema } from '../modules/customers/customers.schemas.ts';
import { createCustomersService } from '../modules/customers/customers.service.ts';
import { logger, type Logger } from '../shared/logger.ts';
import type { Db } from './connection.ts';
import { prepareDatabase } from './prepareDatabase.ts';

/**
 * Clientes ficticios para probar a mano (plan T-34; fuera de la spec, R-93). Van sin
 * normalizar, como los enviaría un cliente HTTP: el schema los normaliza y valida
 * el checksum español (spec 3.3 y 3.6). Cubren los 7 países y los 3 planes.
 */
export const DEMO_CUSTOMERS: readonly Readonly<Record<string, string>>[] = [
  {
    companyName: '  Construcciones Álvarez SL ',
    taxId: 'B-1234567-4',
    email: 'Facturacion@Alvarez.example.com',
    country: 'es',
    plan: 'business',
  },
  {
    companyName: 'Grupo Ibérico de Energía SA',
    taxId: 'A28765436',
    email: 'compras@iberico.example.com',
    country: 'ES',
    plan: 'ENTERPRISE',
  },
  {
    companyName: 'Estudio Muñoz',
    taxId: '12.345.678-Z',
    email: 'hola@estudiomunoz.example.com',
    country: 'ES',
    plan: 'STARTER',
  },
  {
    companyName: 'Traducciones Ivanova',
    taxId: 'x 1234567 l',
    email: 'info@ivanova.example.com',
    country: 'ES',
    plan: 'STARTER',
  },
  {
    companyName: 'Café Lumière SARL',
    taxId: 'FR40303265045',
    email: 'contact@lumiere.example.com',
    country: 'FR',
    plan: 'STARTER',
  },
  {
    companyName: 'Müller Logistik GmbH',
    taxId: 'DE123456789',
    email: 'einkauf@mueller.example.com',
    country: 'DE',
    plan: 'ENTERPRISE',
  },
  {
    companyName: 'Bottega Rossi Srl',
    taxId: 'IT 01234567890',
    email: 'ordini@rossi.example.com',
    country: 'IT',
    plan: 'BUSINESS',
  },
  {
    companyName: 'Conservas Atlântico Lda',
    taxId: 'PT501234567',
    email: 'geral@atlantico.example.com',
    country: 'PT',
    plan: 'STARTER',
  },
  {
    companyName: 'Van Dijk Software BV',
    taxId: 'NL123456789B01',
    email: 'billing@vandijk.example.com',
    country: 'NL',
    plan: 'BUSINESS',
  },
  {
    companyName: 'Thames Data Ltd',
    taxId: 'GB123456789',
    email: 'accounts@thamesdata.example.com',
    country: 'GB',
    plan: 'ENTERPRISE',
  },
];

/**
 * Crea los clientes demo por el mismo camino que `POST /customers`, sin HTTP:
 * schema (normalización y checksum) → service → repositorio. Nunca con SQL directo.
 * Si ya hay algún cliente, no inserta nada y lo indica (R-91). Todo va en una
 * transacción: si un cliente falla, no queda ninguno. Devuelve cuántos ha insertado.
 * Necesita la BD migrada y con las tasas (`prepareDatabase`).
 */
export function seedDemoCustomers(db: Db, log: Logger): number {
  const taxRatesRepo = createTaxRatesRepository(db);
  const customersService = createCustomersService(createCustomersRepository(db));

  const inserted = db.transaction(() => {
    const existing = customersService.search({ search: '', page: 1, pageSize: 1 }).total;
    if (existing > 0) {
      log.info(`Demo seed skipped: ${existing} customers already exist`);
      return 0;
    }
    const schema = buildCreateCustomerSchema(taxRatesRepo.listCodes());
    DEMO_CUSTOMERS.forEach((raw) => customersService.create(schema.parse(raw)));
    log.info(`Demo customers inserted: ${DEMO_CUSTOMERS.length}`);
    return DEMO_CUSTOMERS.length;
  })();
  return inserted;
}

// `npm run db:seed:demo`: migra, carga las tasas y crea los clientes demo en `DB_PATH`.
if (import.meta.main) {
  const db = prepareDatabase(loadConfig().dbPath);
  try {
    seedDemoCustomers(db, logger);
  } finally {
    db.close();
  }
}
