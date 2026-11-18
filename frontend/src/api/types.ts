// Tipos del contrato de la API (spec 5.2–5.9). Importes en céntimos de EUR y tasas en puntos básicos.

export type Plan = 'STARTER' | 'BUSINESS' | 'ENTERPRISE';

export interface Customer {
  id: number;
  companyName: string;
  taxId: string;
  email: string;
  country: string;
  plan: Plan;
  createdAt: string;
}

/** Body de `POST /customers`: el backend normaliza, así que todo llega como string. */
export interface CreateCustomerInput {
  companyName: string;
  taxId: string;
  email: string;
  country: string;
  plan: string;
}

export interface Tier {
  from: number;
  /** `null` en el último tramo. */
  to: number | null;
  units: number;
  unitPriceCents: number;
  subtotalCents: number;
}

/** Body de `POST /simulations` y `POST /simulations/preview`. */
export interface SimulationInput {
  customerId: number;
  users: number;
  storageGb: number;
  apiCallsPerMonth: number;
}

export interface SimulationPreview extends SimulationInput {
  taxRateBp: number;
  baseCents: number;
  taxCents: number;
  totalCents: number;
  currency: 'EUR';
  tiers: Tier[];
}

export interface Simulation extends SimulationPreview {
  id: number;
  createdAt: string;
}

export interface Country {
  code: string;
  taxRateBp: number;
}

export interface CountryList {
  items: Country[];
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

export interface CustomerSearchParams extends PageParams {
  search?: string;
}

/** Elemento de `details[]` del formato de error 5.1. */
export interface ErrorDetail {
  field: string;
  issue: string;
}
