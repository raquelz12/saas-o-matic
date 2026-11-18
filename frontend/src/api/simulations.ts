import { request } from './client.ts';
import type { Page, PageParams, Simulation, SimulationInput, SimulationPreview } from './types.ts';

// Simulaciones (spec 5.6, 5.8 y 5.9).

export function listSimulations(
  customerId: number,
  params: PageParams,
  signal?: AbortSignal,
): Promise<Page<Simulation>> {
  return request<Page<Simulation>>(`/customers/${customerId}/simulations`, {
    query: { page: params.page, pageSize: params.pageSize },
    signal,
  });
}

export function previewSimulation(
  input: SimulationInput,
  signal?: AbortSignal,
): Promise<SimulationPreview> {
  return request<SimulationPreview>('/simulations/preview', {
    method: 'POST',
    body: input,
    signal,
  });
}

export function saveSimulation(input: SimulationInput): Promise<Simulation> {
  return request<Simulation>('/simulations', { method: 'POST', body: input });
}
