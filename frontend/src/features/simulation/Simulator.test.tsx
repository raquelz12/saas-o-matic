import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimulationInput, SimulationPreview, Tier } from '../../api/types.ts';
import {
  PROJECTION_ERROR_MESSAGE,
  PROJECTION_LOADING_MESSAGE,
  PROJECTION_STALE_MESSAGE,
} from './Projection.tsx';
import { rangeMessage, Simulator, STORAGE_MAX } from './Simulator.tsx';
import { PREVIEW_DEBOUNCE_MS } from './usePreview.ts';

// La divisa se simula sustituyendo `useCurrency`, como en SimulationHistory.test.tsx.
vi.mock('../currency/useCurrency.ts', () => ({
  useCurrency: () => ({ currency: 'EUR', rate: 1 }),
}));

const TIERS_15: Tier[] = [
  { from: 1, to: 10, units: 10, unitPriceCents: 1000, subtotalCents: 10000 },
  { from: 11, to: 50, units: 5, unitPriceCents: 800, subtotalCents: 4000 },
];

// Cliente ES (2100 bp): 1 usuario → base 1000; 15 usuarios → base 14 000 (CA-04, CA-13).
function preview(body: SimulationInput): SimulationPreview {
  const baseCents = body.users === 15 ? 14000 : 1000;
  const tiers: Tier[] =
    body.users === 15
      ? TIERS_15
      : [{ from: 1, to: 10, units: 1, unitPriceCents: 1000, subtotalCents: 1000 }];
  const taxCents = (baseCents * 21) / 100;
  return {
    ...body,
    taxRateBp: 2100,
    baseCents,
    taxCents,
    totalCents: baseCents + taxCents,
    currency: 'EUR',
    tiers,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Respuesta del backend; cada test la sustituye si lo necesita. */
let respond: (body: SimulationInput) => Response;
/** Igual que `createQueryClient` de `app/` (sin reintentos), que una feature no puede importar. */
function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const fetchMock = vi.fn<typeof fetch>();
const serverError = () =>
  json({ error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } }, 500);

function sentBodies(): SimulationInput[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as SimulationInput);
}

beforeEach(() => {
  vi.useFakeTimers();
  respond = (body) => json(preview(body));
  fetchMock.mockReset();
  fetchMock.mockImplementation((_url, init) =>
    Promise.resolve(respond(JSON.parse(String(init?.body)) as SimulationInput)),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Avanza `ms` y vacía después las promesas del `fetch` simulado y del parseo de la respuesta. */
async function advance(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
  await act(() => vi.advanceTimersByTimeAsync(0));
}

async function renderSimulator(): Promise<void> {
  render(
    <QueryClientProvider client={testQueryClient()}>
      <Simulator customerId={7} />
    </QueryClientProvider>,
  );
  await advance(0);
}

function euros(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

function projectionField(label: string): string | null | undefined {
  const projection = screen.getByRole('article', { name: 'Proyección' });
  return within(projection).getByText(label).nextElementSibling?.textContent;
}

function slider(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('slider', { name: /Usuarios/ });
}

function storageInput(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Almacenamiento (GB)' });
}

describe('Simulator', () => {
  it('CA-92: el slider se limita a 1–500 y la proyección se actualiza desde el preview', async () => {
    await renderSimulator();
    expect(slider().min).toBe('1');
    expect(slider().max).toBe('500');
    fireEvent.change(slider(), { target: { value: '600' } });
    expect(slider().value).toBe('500');
    fireEvent.change(slider(), { target: { value: '0' } });
    expect(slider().value).toBe('1');

    fireEvent.change(slider(), { target: { value: '15' } });
    await advance(PREVIEW_DEBOUNCE_MS);
    expect(sentBodies().at(-1)).toEqual({
      customerId: 7,
      users: 15,
      storageGb: 0,
      apiCallsPerMonth: 0,
    });
    expect(projectionField('Base')).toBe(euros(140));
    expect(projectionField('Impuesto')).toBe(euros(29.4));
    expect(projectionField('Total')).toBe(euros(169.4));
    const projection = screen.getByRole('article', { name: 'Proyección' });
    const subtotals = within(projection)
      .getAllByText('Subtotal')
      .map((dt) => dt.nextElementSibling?.textContent);
    expect(subtotals).toEqual([euros(100), euros(40)]);
  });

  it('empieza en 1 usuario, 0 GB y 0 llamadas, y muestra la carga mientras llega el preview', () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    render(
      <QueryClientProvider client={testQueryClient()}>
        <Simulator customerId={7} />
      </QueryClientProvider>,
    );
    expect(slider().value).toBe('1');
    expect(storageInput().value).toBe('0');
    expect(screen.getByRole('spinbutton', { name: 'Llamadas a la API / mes' })).toHaveProperty(
      'value',
      '0',
    );
    expect(screen.getByText(PROJECTION_LOADING_MESSAGE).closest('[role="status"]')).not.toBeNull();
  });

  it('cada control lanza el preview con su valor', async () => {
    await renderSimulator();
    fireEvent.change(storageInput(), { target: { value: '250' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Llamadas a la API / mes' }), {
      target: { value: '10000' },
    });
    await advance(PREVIEW_DEBOUNCE_MS);
    expect(sentBodies()).toHaveLength(2);
    expect(sentBodies().at(-1)).toEqual({
      customerId: 7,
      users: 1,
      storageGb: 250,
      apiCallsPerMonth: 10000,
    });
  });

  it.each(['', '1.5', String(STORAGE_MAX + 1)])(
    'un valor no válido (%j) marca el campo, no lanza preview y mantiene la proyección',
    async (value) => {
      await renderSimulator();
      fireEvent.change(storageInput(), { target: { value } });
      await advance(PREVIEW_DEBOUNCE_MS);
      expect(storageInput().getAttribute('aria-invalid')).toBe('true');
      const errorId = storageInput().getAttribute('aria-describedby') ?? '';
      expect(document.getElementById(errorId)?.textContent).toBe(rangeMessage(STORAGE_MAX));
      expect(rangeMessage(STORAGE_MAX)).toBe('Debe ser un entero entre 0 y 100.000.');
      expect(sentBodies()).toHaveLength(1);
      expect(projectionField('Base')).toBe(euros(10));
    },
  );

  it('si falla el primer preview, muestra el error y «Reintentar» lo vuelve a pedir', async () => {
    respond = serverError;
    await renderSimulator();
    const alert = screen.getByText(PROJECTION_ERROR_MESSAGE).closest('[role="alert"]');
    expect(alert).not.toBeNull();
    respond = (body) => json(preview(body));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await advance(0);
    expect(sentBodies()).toHaveLength(2);
    expect(projectionField('Base')).toBe(euros(10));
  });

  it('si falla un preview posterior, mantiene la proyección anterior con un aviso', async () => {
    await renderSimulator();
    respond = serverError;
    fireEvent.change(slider(), { target: { value: '15' } });
    await advance(PREVIEW_DEBOUNCE_MS);
    expect(screen.getByText(PROJECTION_STALE_MESSAGE).closest('[role="alert"]')).not.toBeNull();
    expect(projectionField('Base')).toBe(euros(10));

    respond = (body) => json(preview(body));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await advance(0);
    expect(screen.queryByText(PROJECTION_STALE_MESSAGE)).toBeNull();
    expect(projectionField('Base')).toBe(euros(140));
  });
});
