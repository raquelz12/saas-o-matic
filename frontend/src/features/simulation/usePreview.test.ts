import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimulationInput, SimulationPreview } from '../../api/types.ts';
import { PREVIEW_DEBOUNCE_MS, usePreview } from './usePreview.ts';

/** Petición pendiente al backend: el test decide cuándo y cómo responde. */
interface PendingRequest {
  body: SimulationInput;
  signal: AbortSignal | undefined;
  resolve: (response: Response) => void;
}

let requests: PendingRequest[];
/** Igual que `createQueryClient` de `app/` (sin reintentos), que una feature no puede importar. */
function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const fetchMock = vi.fn<typeof fetch>();

function preview(users: number): SimulationPreview {
  const baseCents = users * 1000;
  return {
    customerId: 7,
    users,
    storageGb: 0,
    apiCallsPerMonth: 0,
    taxRateBp: 2100,
    baseCents,
    taxCents: baseCents * 0.21,
    totalCents: baseCents * 1.21,
    currency: 'EUR',
    tiers: [{ from: 1, to: 10, units: users, unitPriceCents: 1000, subtotalCents: baseCents }],
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const serverError = () =>
  json({ error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } }, 500);

function input(users: number): SimulationInput {
  return { customerId: 7, users, storageGb: 0, apiCallsPerMonth: 0 };
}

beforeEach(() => {
  vi.useFakeTimers();
  requests = [];
  fetchMock.mockReset();
  // Como el `fetch` real, rechaza con `AbortError` si se aborta la petición.
  fetchMock.mockImplementation(
    (_url, init) =>
      new Promise<Response>((resolve, reject) => {
        const signal = init?.signal ?? undefined;
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        requests.push({ body: JSON.parse(String(init?.body)) as SimulationInput, signal, resolve });
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function renderPreview(initial: SimulationInput) {
  const client = testQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(({ value }) => usePreview(value), {
    initialProps: { value: initial },
    wrapper,
  });
}

async function advance(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

async function respond(request: PendingRequest | undefined, response: Response): Promise<void> {
  await act(async () => {
    request?.resolve(response);
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('usePreview', () => {
  it('pide el preview de los valores iniciales y devuelve la proyección', async () => {
    const { result } = renderPreview(input(1));
    expect(result.current.isLoading).toBe(true);
    await advance(0);
    expect(requests.map((request) => request.body)).toEqual([input(1)]);
    await respond(requests[0], json(preview(1)));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.projection).toEqual(preview(1));
  });

  it('con varios cambios seguidos, solo pide el último tras 250 ms sin cambios', async () => {
    const { rerender } = renderPreview(input(1));
    await advance(0);
    await respond(requests[0], json(preview(1)));

    rerender({ value: input(2) });
    await advance(PREVIEW_DEBOUNCE_MS - 1);
    rerender({ value: input(3) });
    await advance(PREVIEW_DEBOUNCE_MS - 1);
    expect(requests).toHaveLength(1);
    await advance(1);
    expect(requests.map((request) => request.body.users)).toEqual([1, 3]);
  });

  it('aborta la petición anterior y solo pinta la respuesta de la última', async () => {
    const { result, rerender } = renderPreview(input(1));
    await advance(0);
    await respond(requests[0], json(preview(1)));

    rerender({ value: input(2) });
    await advance(PREVIEW_DEBOUNCE_MS);
    rerender({ value: input(3) });
    await advance(PREVIEW_DEBOUNCE_MS);
    const [, second, third] = requests;
    expect(second?.signal?.aborted).toBe(true);
    expect(third?.signal?.aborted).toBe(false);
    // Mientras llega la nueva, se mantiene la proyección anterior.
    expect(result.current.projection).toEqual(preview(1));

    await respond(third, json(preview(3)));
    await respond(second, json(preview(2)));
    expect(result.current.projection).toEqual(preview(3));
  });

  it('si falla, conserva la última proyección válida y el reintento vuelve a pedirla', async () => {
    const { result, rerender } = renderPreview(input(1));
    await advance(0);
    await respond(requests[0], json(preview(1)));

    rerender({ value: input(2) });
    await advance(PREVIEW_DEBOUNCE_MS);
    await respond(requests[1], serverError());
    expect(result.current.isError).toBe(true);
    expect(result.current.projection).toEqual(preview(1));

    act(() => {
      result.current.retry();
    });
    await advance(0);
    expect(requests.map((request) => request.body.users)).toEqual([1, 2, 2]);
    await respond(requests[2], json(preview(2)));
    expect(result.current.isError).toBe(false);
    expect(result.current.projection).toEqual(preview(2));
  });

  it('si falla sin proyección previa, no hay proyección ni estado de carga', async () => {
    const { result } = renderPreview(input(1));
    await advance(0);
    await respond(requests[0], serverError());
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.projection).toBeUndefined();
  });
});
