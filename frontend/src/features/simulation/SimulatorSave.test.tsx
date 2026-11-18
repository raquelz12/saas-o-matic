import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Simulation, SimulationInput } from '../../api/types.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import { SAVE_ERROR_MESSAGE } from './SaveSimulationButton.tsx';
import { Simulator } from './Simulator.tsx';

// Guardado del simulador (RF-39). CA-93 se prueba en CustomerDetail.test.tsx, donde están juntos
// el simulador y el historial. La divisa se simula como en Simulator.test.tsx.
vi.mock('../currency/useCurrency.ts', () => ({
  useCurrency: () => ({ currency: 'EUR', rate: 1 }),
}));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function saved(body: SimulationInput): Simulation {
  return {
    id: 9,
    ...body,
    taxRateBp: 2100,
    baseCents: 1000,
    taxCents: 210,
    totalCents: 1210,
    currency: 'EUR',
    tiers: [{ from: 1, to: 10, units: 1, unitPriceCents: 1000, subtotalCents: 1000 }],
    createdAt: '2026-11-18T10:00:00.000Z',
  };
}

const fetchMock = vi.fn<typeof fetch>();
/** Respuesta de `POST /simulations`; cada test la sustituye si lo necesita. */
let respondSave: (body: SimulationInput) => Promise<Response>;

function isSave(url: Parameters<typeof fetch>[0]): boolean {
  return new URL(String(url)).pathname === '/api/simulations';
}

function savedBodies(): SimulationInput[] {
  return fetchMock.mock.calls
    .filter(([url]) => isSave(url))
    .map(([, init]) => JSON.parse(String(init?.body)) as SimulationInput);
}

beforeEach(() => {
  respondSave = (body) => Promise.resolve(json(saved(body), 201));
  fetchMock.mockReset();
  fetchMock.mockImplementation((url, init) => {
    const body = JSON.parse(String(init?.body)) as SimulationInput;
    // El preview responde con la misma forma que el guardado: basta para pintar la proyección.
    return isSave(url) ? respondSave(body) : Promise.resolve(json(saved(body)));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSimulator(onSaved: () => void = () => undefined): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Simulator customerId={7} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return client;
}

function saveButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: /^Guarda/ });
}

function slider(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('slider', { name: /Usuarios/ });
}

function storageInput(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Almacenamiento (GB)' });
}

describe('Simulator: guardado', () => {
  it('guarda los valores actuales, avisa con onSaved, invalida el historial y conserva el formulario', async () => {
    const onSaved = vi.fn();
    const client = renderSimulator(onSaved);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.change(slider(), { target: { value: '15' } });
    fireEvent.change(storageInput(), { target: { value: '250' } });
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect(savedBodies()).toEqual([
      { customerId: 7, users: 15, storageGb: 250, apiCallsPerMonth: 0 },
    ]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.simulations.historyAll(7),
    });
    expect(slider().value).toBe('15');
    expect(storageInput().value).toBe('250');
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false);
    });
  });

  it('el doble clic produce una sola petición', async () => {
    const onSaved = vi.fn();
    renderSimulator(onSaved);
    fireEvent.click(saveButton());
    fireEvent.click(saveButton());
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect(savedBodies()).toHaveLength(1);
  });

  it('el botón está deshabilitado mientras la petición está en curso', async () => {
    let finish: (response: Response) => void = () => undefined;
    respondSave = () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      });
    renderSimulator();
    fireEvent.click(saveButton());
    await waitFor(() => {
      expect(saveButton().disabled).toBe(true);
    });
    expect(saveButton().textContent).toBe('Guardando…');
    fireEvent.click(saveButton());
    expect(savedBodies()).toHaveLength(1);

    finish(json(saved(savedBodies()[0] as SimulationInput), 201));
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false);
    });
    expect(saveButton().textContent).toBe('Guardar');
  });

  it('con un control no válido el botón está deshabilitado', () => {
    renderSimulator();
    fireEvent.change(storageInput(), { target: { value: '1.5' } });
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(storageInput(), { target: { value: '10' } });
    expect(saveButton().disabled).toBe(false);
  });

  it('si falla, muestra el aviso sin reintento automático y se puede volver a guardar', async () => {
    const onSaved = vi.fn();
    respondSave = () =>
      Promise.resolve(json({ error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } }, 500));
    renderSimulator(onSaved);
    fireEvent.click(saveButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(SAVE_ERROR_MESSAGE);
    expect(onSaved).not.toHaveBeenCalled();
    expect(savedBodies()).toHaveLength(1);
    expect(saveButton().disabled).toBe(false);

    respondSave = (body) => Promise.resolve(json(saved(body), 201));
    fireEvent.click(saveButton());
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(SAVE_ERROR_MESSAGE)).toBeNull();
    expect(savedBodies()).toHaveLength(2);
  });
});
