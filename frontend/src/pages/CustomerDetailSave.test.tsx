import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, Simulation } from '../api/types.ts';
import { createQueryClient } from '../app/queryClient.ts';
import { routes } from '../app/router.tsx';
import { CurrencyProvider } from '../features/currency/CurrencyContext.tsx';

// Guardado desde el detalle del cliente (RF-39, CA-93): el simulador y el historial juntos, con
// las rutas, el layout y el `CurrencyProvider` reales. El backend se simula con un historial en
// memoria al que el guardado añade la simulación nueva en primer lugar (spec 5.6).

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const customer: Customer = {
  id: 7,
  companyName: 'Acme Software SL',
  taxId: 'B12345674',
  email: 'billing@acme.example',
  country: 'ES',
  plan: 'BUSINESS',
  createdAt: '2026-11-01T10:00:00.000Z',
};

// 1 usuario en ES (2100 bp): base 1000 e impuesto 210.
const simulation: Simulation = {
  id: 1,
  customerId: 7,
  users: 1,
  storageGb: 0,
  apiCallsPerMonth: 0,
  taxRateBp: 2100,
  baseCents: 1000,
  taxCents: 210,
  totalCents: 1210,
  currency: 'EUR',
  tiers: [{ from: 1, to: 10, units: 1, unitPriceCents: 1000, subtotalCents: 1000 }],
  createdAt: '2026-11-18T09:30:00.000Z',
};

const PAGE_SIZE = 20;
/** Historial del cliente, de la más reciente a la más antigua. */
let stored: Simulation[];
const fetchMock = vi.fn<typeof fetch>();

function fxBody() {
  return {
    result: 'success',
    time_last_update_utc: 'Wed, 18 Nov 2026 00:02:31 +0000',
    time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
    rates: { EUR: 1, USD: 1.085, GBP: 0.865, JPY: 162.37 },
  };
}

function historyPage(url: URL): Response {
  const page = Number(url.searchParams.get('page'));
  const items = stored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return json({ items, page, pageSize: PAGE_SIZE, total: stored.length });
}

function respond(input: Parameters<typeof fetch>[0], init?: RequestInit): Response {
  const url = new URL(String(input));
  if (!url.pathname.startsWith('/api/')) return json(fxBody());
  if (url.pathname === '/api/customers/7') return json(customer);
  if (url.pathname === '/api/customers/7/simulations') return historyPage(url);
  const body = JSON.parse(String(init?.body)) as Partial<Simulation>;
  if (url.pathname === '/api/simulations/preview') return json({ ...simulation, ...body });
  const created: Simulation = { ...simulation, ...body, id: stored.length + 1 };
  stored = [created, ...stored];
  return json(created, 201);
}

beforeEach(() => {
  window.localStorage.clear();
  // 21 simulaciones (ids 21…1): dos páginas de 20.
  stored = Array.from({ length: 21 }, (_, i) => ({ ...simulation, id: 21 - i }));
  fetchMock.mockReset();
  fetchMock.mockImplementation((input, init) => Promise.resolve(respond(input, init)));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <CurrencyProvider>
        <RouterProvider router={router} />
      </CurrencyProvider>
    </QueryClientProvider>,
  );
}

function slider(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('slider', { name: /Usuarios/ });
}

describe('CustomerDetail: guardado', () => {
  it('CA-93: al pulsar Guardar, la simulación aparece primera en el historial', async () => {
    renderAt('/customers/7');
    await screen.findByRole('article', { name: 'Simulación 21' });
    // Desde la página 2, el guardado vuelve a pedir la página 1 (RF-39).
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('article', { name: 'Simulación 1' });
    fireEvent.change(slider(), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      const list = screen.getByRole('list', { name: 'Simulaciones' });
      const [first] = within(list).getAllByRole('article');
      expect(first?.getAttribute('aria-label')).toBe('Simulación 22');
    });
    expect(screen.getByText('Página 1 de 2')).toBeTruthy();
    // El formulario conserva sus valores.
    expect(slider().value).toBe('15');
  });
});
