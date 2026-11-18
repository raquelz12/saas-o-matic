import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page, Simulation } from '../../api/types.ts';
import {
  formatDateTime,
  HISTORY_EMPTY_MESSAGE,
  HISTORY_ERROR_MESSAGE,
  SimulationHistory,
} from './SimulationHistory.tsx';

// La divisa se simula sustituyendo `useCurrency` (superficie pública de `currency`): una feature
// no puede importar el `CurrencyProvider`. `<Money>` y `<MoneyTotal>` son los reales.
const currencyMock = vi.hoisted(() => ({ value: { currency: 'EUR', rate: 1 } }));
vi.mock('../currency/useCurrency.ts', () => ({ useCurrency: () => currencyMock.value }));

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
}

// 60 usuarios en ES (2100 bp): tres tramos, base 47 000, impuesto 9870.
function simulation(overrides: Partial<Simulation> = {}): Simulation {
  return {
    id: 3,
    customerId: 7,
    users: 60,
    storageGb: 250,
    apiCallsPerMonth: 10000,
    taxRateBp: 2100,
    baseCents: 47000,
    taxCents: 9870,
    totalCents: 56870,
    currency: 'EUR',
    tiers: [
      { from: 1, to: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10000 },
      { from: 11, to: 50, units: 40, unitPriceCents: 800, subtotalCents: 32000 },
      { from: 51, to: null, units: 10, unitPriceCents: 500, subtotalCents: 5000 },
    ],
    createdAt: '2026-11-18T09:30:00.000Z',
    ...overrides,
  };
}

function pageResponse(items: Simulation[], page = 1, total = items.length): Response {
  const body: Page<Simulation> = { items, page, pageSize: 20, total };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

function errorResponse(): Response {
  const body = { error: { code: 'INTERNAL_ERROR', message: 'Internal error', details: [] } };
  return new Response(JSON.stringify(body), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  currencyMock.value = { currency: 'EUR', rate: 1 };
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// La página la guarda quien compone el historial (CustomerDetail); aquí, un estado local.
function HistoryWithPage() {
  const [page, setPage] = useState(1);
  return <SimulationHistory customerId={7} page={page} onPageChange={setPage} />;
}

function renderHistory() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HistoryWithPage />
    </QueryClientProvider>,
  );
}

function lastUrl(): URL {
  return new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
}

/** Valor de un campo `<dt>`/`<dd>` dentro de un contenedor. */
function field(container: HTMLElement, label: string): string | null {
  return within(container).getByText(label).nextElementSibling?.textContent ?? null;
}

describe('SimulationHistory', () => {
  it('pide la página 1 del historial del cliente, sin pageSize', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([simulation()]));
    renderHistory();
    await screen.findByRole('article', { name: 'Simulación 3' });
    expect(lastUrl().pathname).toBe('/api/customers/7/simulations');
    expect(Object.fromEntries(lastUrl().searchParams)).toEqual({ page: '1' });
  });

  it('muestra el estado de carga mientras llega el historial', () => {
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined));
    renderHistory();
    expect(screen.getByRole('status').textContent).toBe('Cargando historial…');
  });

  it('muestra el estado vacío si no hay simulaciones', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([]));
    renderHistory();
    expect(await screen.findByText(HISTORY_EMPTY_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
  });

  it('un error muestra el aviso y «Reintentar» vuelve a pedir el historial', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse());
    fetchMock.mockResolvedValueOnce(pageResponse([simulation()]));
    renderHistory();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(HISTORY_ERROR_MESSAGE);
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('article', { name: 'Simulación 3' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cada simulación muestra fecha, usuarios, GB, llamadas, base, impuesto, total y tasa', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([simulation()]));
    renderHistory();
    const card = await screen.findByRole('article', { name: 'Simulación 3' });
    expect(within(card).getByRole('heading', { level: 3 }).textContent).toBe(
      formatDateTime('2026-11-18T09:30:00.000Z'),
    );
    expect(field(card, 'Usuarios')).toBe('60');
    expect(field(card, 'Almacenamiento')).toBe('250 GB');
    expect(field(card, 'Llamadas a la API / mes')).toBe('10.000');
    expect(field(card, 'Base')).toBe(money(470, 'EUR'));
    expect(field(card, 'Impuesto')).toBe(money(98.7, 'EUR'));
    expect(field(card, 'Total')).toBe(money(568.7, 'EUR'));
    expect(field(card, 'Tasa aplicada')).toBe(
      new Intl.NumberFormat('es-ES', { style: 'percent' }).format(0.21),
    );
  });

  it('el desglose por tramos está en un desplegable con rango, unidades, precio y subtotal', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([simulation()]));
    renderHistory();
    const card = await screen.findByRole('article', { name: 'Simulación 3' });
    const details = within(card).getByText('Ver desglose por tramos').closest('details');
    expect(details?.open).toBe(false);

    const tiers = within(card).getAllByRole('listitem');
    expect(tiers.map((tier) => tier.firstElementChild?.textContent)).toEqual([
      'Usuarios 1–10',
      'Usuarios 11–50',
      'Usuarios desde 51',
    ]);
    const [first] = tiers;
    if (first === undefined) throw new Error('sin tramos');
    expect(field(first, 'Unidades')).toBe('10');
    expect(field(first, 'Precio unitario')).toBe(money(10, 'EUR'));
    expect(field(first, 'Subtotal')).toBe(money(100, 'EUR'));
  });

  it('RB-14: cada subtotal de tramo se convierte y se redondea por separado', async () => {
    currencyMock.value = { currency: 'JPY', rate: 162.37 };
    fetchMock.mockResolvedValueOnce(pageResponse([simulation()]));
    renderHistory();
    const card = await screen.findByRole('article', { name: 'Simulación 3' });
    const subtotals = within(card)
      .getAllByText('Subtotal')
      .map((dt) => dt.nextElementSibling?.textContent);
    // 100 × 162,37 = 16 237; 320 × 162,37 = 51 958,4 → 51 958; 50 × 162,37 = 8118,5 → 8119.
    expect(subtotals).toEqual([money(16237, 'JPY'), money(51958, 'JPY'), money(8119, 'JPY')]);
    // La base se convierte por su cuenta: 470 × 162,37 = 76 313,9 → 76 314.
    expect(field(card, 'Base')).toBe(money(76314, 'JPY'));
  });

  it('la paginación pide la página siguiente del historial', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([simulation()], 1, 25));
    fetchMock.mockResolvedValueOnce(pageResponse([simulation({ id: 1 })], 2, 25));
    renderHistory();
    await screen.findByRole('article', { name: 'Simulación 3' });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByRole('article', { name: 'Simulación 1' })).toBeTruthy();
    expect(lastUrl().searchParams.get('page')).toBe('2');
    expect(screen.getByText('Página 2 de 2')).toBeTruthy();
  });
});
