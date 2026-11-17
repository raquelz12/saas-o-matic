import { NotFoundError } from '../../shared/errors.ts';
import type { Page, PageParams } from '../../shared/pagination.ts';
import type { TaxRatesRepository } from '../countries/countries.repository.ts';
import type { CustomersRepository } from '../customers/customers.repository.ts';
import type { Tier } from './domain/pricing.ts';
import { calculateQuote } from './domain/quote.ts';
import type { Simulation, SimulationsRepository } from './simulations.repository.ts';

// El controller no puede importar el repositorio (architecture §2): recibe el tipo desde aquí.
export type { Simulation };

/**
 * Body ya validado por el schema (spec 3.4). Se define aquí para que el service
 * no dependa de zod; `SimulationInput` es compatible.
 */
export interface SimulationRequest {
  customerId: number;
  users: number;
  storageGb: number;
  apiCallsPerMonth: number;
}

/** Resultado del cálculo: `SimulationPreview` de la spec 5.2 sin `currency`, que añade el controller. */
export interface SimulationQuote extends SimulationRequest {
  taxRateBp: number;
  baseCents: number;
  taxCents: number;
  totalCents: number;
  tiers: Tier[];
}

/** Petición validada de `GET /customers/:id/simulations` (spec 5.6). */
export interface HistoryRequest extends PageParams {
  customerId: number;
}

/** Ejecuta `fn` dentro de una transacción síncrona; lo construye `app.ts` con la conexión. */
export type RunInTransaction = <T>(fn: () => T) => T;

export interface SimulationsServiceDeps {
  customersRepo: Pick<CustomersRepository, 'findById'>;
  taxRatesRepo: Pick<TaxRatesRepository, 'getRateBp'>;
  simulationsRepo: Pick<SimulationsRepository, 'insert' | 'listByCustomer'>;
  runInTransaction: RunInTransaction;
}

export interface SimulationsService {
  /** Calcula sin persistir (RF-26). Cliente inexistente → `NotFoundError` (RF-19). */
  preview(input: SimulationRequest): SimulationQuote;
  /** Calcula y persiste con el snapshot de tasa y tramos (RF-18, RF-24, RB-09). */
  save(input: SimulationRequest): Simulation;
  /**
   * Historial paginado con el snapshot guardado, sin recalcular (RF-27, RB-09).
   * Cliente inexistente → `NotFoundError` (404).
   */
  history(request: HistoryRequest): Page<Simulation>;
}

/** Cliente → página: dentro de una misma transacción, `items` y `total` son coherentes. */
function history(
  deps: SimulationsServiceDeps,
  { customerId, page, pageSize }: HistoryRequest,
): Page<Simulation> {
  if (deps.customersRepo.findById(customerId) === undefined) throw new NotFoundError();
  const { items, total } = deps.simulationsRepo.listByCustomer(customerId, { page, pageSize });
  return { items, page, pageSize, total };
}

/**
 * Cálculo único que compartirán el preview y el guardado (RB-10, architecture §4):
 * cliente → tasa de su país leída en el momento (RB-06) → `calculateQuote`.
 * El almacenamiento, las llamadas y el plan no intervienen (RB-04).
 */
function quote(deps: SimulationsServiceDeps, input: SimulationRequest): SimulationQuote {
  const customer = deps.customersRepo.findById(input.customerId);
  if (customer === undefined) throw new NotFoundError();
  const taxRateBp = deps.taxRatesRepo.getRateBp(customer.country);
  // La FK customers.country_code → tax_rates lo impide: si ocurre, es un bug (500).
  if (taxRateBp === undefined) {
    throw new Error(`Missing tax rate for country ${customer.country}`);
  }
  return { ...input, taxRateBp, ...calculateQuote(input.users, taxRateBp) };
}

export function createSimulationsService(deps: SimulationsServiceDeps): SimulationsService {
  return {
    preview: (input) => deps.runInTransaction(() => quote(deps, input)),
    // Misma función de cálculo que el preview (RB-10) y en la misma transacción que el INSERT.
    save: (input) => deps.runInTransaction(() => deps.simulationsRepo.insert(quote(deps, input))),
    history: (request) => deps.runInTransaction(() => history(deps, request)),
  };
}
