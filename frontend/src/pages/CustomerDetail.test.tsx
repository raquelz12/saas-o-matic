import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, Page, Simulation } from '../api/types.ts';
import { createQueryClient } from '../app/queryClient.ts';
import { routes } from '../app/router.tsx';
import { CurrencyProvider } from '../features/currency/CurrencyContext.tsx';
import { CUSTOMER_ERROR_MESSAGE, NOT_FOUND_MESSAGE } from './CustomerDetail.tsx';

const USD_RATE = 1.085;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fxBody() {
  return {
    result: 'success',
    time_last_update_utc: 'Wed, 18 Nov 2026 00:02:31 +0000',
    time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
    rates: { EUR: 1, USD: USD_RATE, GBP: 0.865, JPY: 162.37 },
  };
}

function errorBody(code: string) {
  return { error: { code, message: code, details: [] } };
}

function page<T>(items: T[]): Page<T> {
  return { items, page: 1, pageSize: 20, total: items.length };
}

let customer: Customer;

// 15 usuarios en ES (2100 bp): base 14 000 e impuesto 2940.
const simulation: Simulation = {
  id: 3,
  customerId: 7,
  users: 15,
  storageGb: 100,
  apiCallsPerMonth: 5000,
  taxRateBp: 2100,
  baseCents: 14000,
  taxCents: 2940,
  totalCents: 16940,
  currency: 'EUR',
  tiers: [
    { from: 1, to: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10000 },
    { from: 11, to: 50, units: 5, unitPriceCents: 800, subtotalCents: 4000 },
  ],
  createdAt: '2026-11-18T09:30:00.000Z',
};

/** Respuesta de `GET /customers/7`; cada test la sustituye si lo necesita. */
let customerResponse: () => Response;

const fetchMock = vi.fn<typeof fetch>();

function backendPath(input: Parameters<typeof fetch>[0]): string | undefined {
  const { pathname } = new URL(String(input));
  return pathname.startsWith('/api/') ? pathname : undefined;
}

function backendCalls(): string[] {
  return fetchMock.mock.calls.flatMap(([input]) => backendPath(input) ?? []);
}

function respond(input: Parameters<typeof fetch>[0]): Response {
  const path = backendPath(input);
  if (path === undefined) return json(fxBody());
  if (path === '/api/customers') return json(page([customer]));
  if (path === '/api/customers/7/simulations') return json(page([simulation]));
  if (path === '/api/customers/7') return customerResponse();
  return json(errorBody('NOT_FOUND'), 404);
}

beforeEach(() => {
  window.localStorage.clear();
  customer = {
    id: 7,
    companyName: 'Acme Software SL',
    taxId: 'B12345674',
    email: 'billing@acme.example',
    country: 'ES',
    plan: 'BUSINESS',
    createdAt: '2026-11-01T10:00:00.000Z',
  };
  customerResponse = () => json(customer);
  fetchMock.mockReset();
  fetchMock.mockImplementation((input) => Promise.resolve(respond(input)));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// La aplicación completa (layout con selector de divisa y rutas reales).
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

function usd(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
}

function field(container: HTMLElement, label: string): string | null {
  return within(container).getByText(label).nextElementSibling?.textContent ?? null;
}

function currencySelect(): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>('combobox', { name: 'Divisa' });
}

describe('CustomerDetail', () => {
  it('muestra la tarjeta con los datos del cliente y su historial', async () => {
    renderAt('/customers/7');
    const card = await screen.findByRole('article', { name: 'Datos del cliente' });
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe('Acme Software SL');
    expect(field(card, 'Identificador fiscal')).toBe('B12345674');
    expect(field(card, 'Email')).toBe('billing@acme.example');
    expect(field(card, 'País')).toBe('España');
    expect(field(card, 'Plan')).toBe('Business');
    expect(field(card, 'Fecha de alta')).toBe(
      new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date('2026-11-01T10:00:00.000Z'),
      ),
    );
    expect(await screen.findByRole('article', { name: 'Simulación 3' })).toBeTruthy();
  });

  it('CA-105: un nombre con <script> se pinta como texto en la tarjeta de detalle', async () => {
    customer.companyName = '<script>alert(1)</script>';
    renderAt('/customers/7');
    const card = await screen.findByRole('article', { name: 'Datos del cliente' });
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe(
      '<script>alert(1)</script>',
    );
    expect(card.querySelector('script')).toBeNull();
  });

  it('muestra el estado de carga mientras llega el cliente', () => {
    fetchMock.mockImplementation((input) =>
      backendPath(input) === undefined
        ? Promise.resolve(json(fxBody()))
        : new Promise<Response>(() => undefined),
    );
    renderAt('/customers/7');
    expect(screen.getByText('Cargando cliente…').closest('[role="status"]')).not.toBeNull();
  });

  it('un 404 muestra «Cliente no encontrado.» sin reintento y no pide el historial', async () => {
    customerResponse = () => json(errorBody('NOT_FOUND'), 404);
    renderAt('/customers/7');
    const alert = await screen.findByText(NOT_FOUND_MESSAGE);
    expect(within(alert.closest('[role="alert"]') as HTMLElement).queryByRole('button')).toBeNull();
    expect(backendCalls()).toEqual(['/api/customers/7']);
  });

  it('otro error muestra el aviso y «Reintentar» vuelve a pedir el cliente', async () => {
    customerResponse = () => json(errorBody('INTERNAL_ERROR'), 500);
    renderAt('/customers/7');
    await screen.findByText(CUSTOMER_ERROR_MESSAGE);
    customerResponse = () => json(customer);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('article', { name: 'Datos del cliente' })).toBeTruthy();
    expect(backendCalls().filter((path) => path === '/api/customers/7')).toHaveLength(2);
  });

  it.each(['abc', '0', '01', '-1', '1.0', '2147483648'])(
    'un id sin formato válido (%s) muestra «Cliente no encontrado.» sin pedir nada al backend',
    (id) => {
      renderAt(`/customers/${id}`);
      expect(screen.getByText(NOT_FOUND_MESSAGE)).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
      expect(backendCalls()).toEqual([]);
    },
  );

  it('CA-99: con USD seleccionado, al navegar del dashboard al detalle todo sigue en USD', async () => {
    renderAt('/');
    await waitFor(() => {
      expect(currencySelect().disabled).toBe(false);
    });
    fireEvent.change(currencySelect(), { target: { value: 'USD' } });

    fireEvent.click(await screen.findByRole('link', { name: /Acme Software SL/ }));
    const history = await screen.findByRole('article', { name: 'Simulación 3' });
    expect(currencySelect().value).toBe('USD');
    // 140,00 × 1,085 = 151,90; 29,40 × 1,085 = 31,899 → 31,90; total = 183,80 (CA-98).
    expect(field(history, 'Base')).toBe(usd(151.9));
    expect(field(history, 'Impuesto')).toBe(usd(31.9));
    expect(field(history, 'Total')).toBe(usd(183.8));
    const subtotals = within(history)
      .getAllByText('Subtotal')
      .map((dt) => dt.nextElementSibling?.textContent);
    expect(subtotals).toEqual([usd(108.5), usd(43.4)]);
  });
});
