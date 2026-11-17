import { NotFoundError } from '../../shared/errors.ts';
import type { TaxRatesRepository } from '../countries/countries.repository.ts';
import type { CustomersRepository } from '../customers/customers.repository.ts';
import type { Tier } from './domain/pricing.ts';
import { calculateQuote } from './domain/quote.ts';

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

/** Ejecuta `fn` dentro de una transacción síncrona; lo construye `app.ts` con la conexión. */
export type RunInTransaction = <T>(fn: () => T) => T;

export interface SimulationsServiceDeps {
  customersRepo: Pick<CustomersRepository, 'findById'>;
  taxRatesRepo: Pick<TaxRatesRepository, 'getRateBp'>;
  runInTransaction: RunInTransaction;
}

export interface SimulationsService {
  /** Calcula sin persistir (RF-26). Cliente inexistente → `NotFoundError` (RF-19). */
  preview(input: SimulationRequest): SimulationQuote;
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
  };
}
