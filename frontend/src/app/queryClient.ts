import { QueryClient } from '@tanstack/react-query';

// Configuración global de TanStack Query (architecture §3, ADR-005): el reintento es siempre
// manual con `refetch()` (RF-43), así que no hay reintentos automáticos ni refetch al enfocar.
// Es una fábrica para que cada test tenga su propio cliente y su propia caché.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
