import type { CustomerSearchParams, PageParams, SimulationInput } from './types.ts';

// Query keys de TanStack Query (architecture §3). Son jerárquicas para poder invalidar por prefijo:
// p. ej. `simulations.historyAll(id)` invalida todas las páginas del historial de un cliente.

export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    list: (params: CustomerSearchParams) => ['customers', 'list', params] as const,
    detail: (id: number) => ['customers', 'detail', id] as const,
  },
  simulations: {
    historyAll: (customerId: number) => ['simulations', 'history', customerId] as const,
    history: (customerId: number, params: PageParams) =>
      ['simulations', 'history', customerId, params] as const,
    preview: (input: SimulationInput) => ['simulations', 'preview', input] as const,
  },
  countries: {
    all: ['countries'] as const,
  },
};
