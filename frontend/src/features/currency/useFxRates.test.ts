import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FxError } from './fxClient.ts';
import { fxRatesKey, useFxRates } from './useFxRates.ts';

const NOW = new Date('2026-11-18T10:00:00Z').getTime();
const ONE_HOUR = 60 * 60 * 1000;

function fxBody(nextUpdateMs: number, usd = 1.0812): unknown {
  return {
    result: 'success',
    time_last_update_utc: 'Wed, 18 Nov 2026 00:02:31 +0000',
    time_next_update_unix: Math.floor(nextUpdateMs / 1000),
    rates: { EUR: 1, USD: usd, GBP: 0.8571, JPY: 162.38 },
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn<typeof fetch>();

// Misma configuración que `app/queryClient.ts`, que una feature no puede importar (architecture §3).
function createTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
}

function renderFx(client = createTestClient()) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, ...renderHook(() => useFxRates(), { wrapper }) };
}

/** Avanza los timers falsos dentro de `act` para que React procese las actualizaciones. */
async function advance(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

beforeEach(() => {
  // Con timers falsos, las notificaciones que TanStack programa con `setTimeout(0)` no llegan a
  // React dentro de `act`. En microtareas sí (API de TanStack para tests).
  notifyManager.setScheduler(queueMicrotask);
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  vi.setSystemTime(NOW);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  notifyManager.setScheduler((callback) => {
    setTimeout(callback, 0);
  });
});

describe('useFxRates', () => {
  it('CA-103: cambiar de divisa varias veces no repite peticiones antes de time_next_update_unix', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(fxBody(NOW + ONE_HOUR))));
    const first = renderFx();
    await advance(0);
    expect(first.result.current.data?.rates.USD).toBe(1.0812);
    first.rerender();

    // Cada cambio de divisa vuelve a pintar y monta nuevos consumidores del hook.
    for (let i = 0; i < 3; i += 1) {
      const other = renderFx(first.client);
      await advance(10 * 60 * 1000);
      expect(other.result.current.data?.rates.USD).toBe(1.0812);
      other.unmount();
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('al llegar a time_next_update_unix se piden de nuevo', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(fxBody(NOW + ONE_HOUR)))
      .mockResolvedValueOnce(jsonResponse(fxBody(NOW + 2 * ONE_HOUR, 1.1)));
    const { result, client } = renderFx();
    await advance(ONE_HOUR - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(fxRatesKey)).toBe(result.current.data);
    expect(result.current.data?.rates.USD).toBe(1.1);
  });

  it('una respuesta inválida se trata como fallo', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...(fxBody(NOW + ONE_HOUR) as object), result: 'error' }),
    );
    const { result } = renderFx();
    await advance(0);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(FxError);
    expect(result.current.data).toBeUndefined();
  });

  it('si falla el refresco se mantienen los datos anteriores y no hay reintento automático', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(fxBody(NOW + ONE_HOUR)))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(fxBody(NOW + 3 * ONE_HOUR, 1.2)));
    const { result } = renderFx();
    await advance(ONE_HOUR);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.isError).toBe(true);
    expect(result.current.data?.rates.USD).toBe(1.0812);

    await advance(24 * ONE_HOUR);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Reintento manual (RF-43).
    await act(() => result.current.refetch());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.isError).toBe(false);
    expect(result.current.data?.rates.USD).toBe(1.2);
  });

  it('el timeout pasa al estado de error', async () => {
    fetchMock.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    const { result } = renderFx();
    await advance(0);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toMatchObject({ name: 'TimeoutError' });
  });
});
