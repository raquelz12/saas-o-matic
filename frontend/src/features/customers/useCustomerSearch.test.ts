import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, Page } from '../../api/types.ts';
import { SEARCH_DEBOUNCE_MS, useCustomerSearch } from './useCustomerSearch.ts';

const fetchMock = vi.fn<typeof fetch>();

function pageResponse(page: number, items: Customer[] = []): Response {
  const body: Page<Customer> = { items, page, pageSize: 20, total: 45 };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

/** Query string de la llamada `n` a `fetch`, como objeto. */
function requestedQuery(n: number): Record<string, string> {
  const url = fetchMock.mock.calls[n]?.[0];
  return Object.fromEntries(new URL(String(url)).searchParams);
}

// Misma configuración que `app/queryClient.ts`, que una feature no puede importar (architecture §3).
function renderSearch() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useCustomerSearch(), { wrapper });
}

async function advance(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

beforeEach(() => {
  // Como en `useFxRates.test.ts`: con timers falsos, TanStack notifica a React en microtareas.
  notifyManager.setScheduler(queueMicrotask);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  fetchMock.mockReset();
  fetchMock.mockImplementation((input) => {
    const page = Number(new URL(String(input)).searchParams.get('page'));
    return Promise.resolve(pageResponse(page));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  notifyManager.setScheduler((callback) => {
    setTimeout(callback, 0);
  });
});

describe('useCustomerSearch', () => {
  it('al montar pide la página 1 sin texto de búsqueda', async () => {
    const { result } = renderSearch();
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedQuery(0)).toEqual({ page: '1' });
    expect(result.current.query.data?.total).toBe(45);
  });

  it('la query usa el texto debounced: no pide los textos intermedios', async () => {
    const { result } = renderSearch();
    await advance(0);
    for (const text of ['a', 'ac', 'acme']) {
      act(() => {
        result.current.setSearch(text);
      });
      await advance(100);
    }
    expect(result.current.search).toBe('acme');
    await advance(SEARCH_DEBOUNCE_MS - 101);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedQuery(1)).toEqual({ search: 'acme', page: '1' });
  });

  it('un cambio de texto devuelve page a 1', async () => {
    const { result } = renderSearch();
    await advance(0);
    act(() => {
      result.current.setPage(3);
    });
    await advance(0);
    expect(result.current.page).toBe(3);
    expect(requestedQuery(1)).toEqual({ page: '3' });

    act(() => {
      result.current.setSearch('acme');
    });
    await advance(SEARCH_DEBOUNCE_MS);
    expect(result.current.page).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestedQuery(2)).toEqual({ search: 'acme', page: '1' });
  });

  it('volver a un texto anterior no recupera su página', async () => {
    const { result } = renderSearch();
    await advance(0);
    act(() => {
      result.current.setPage(3);
    });
    for (const text of ['acme', '']) {
      act(() => {
        result.current.setSearch(text);
      });
      await advance(SEARCH_DEBOUNCE_MS);
    }
    expect(result.current.page).toBe(1);
  });

  it('cambiar de página con el mismo texto conserva el texto', async () => {
    const { result } = renderSearch();
    act(() => {
      result.current.setSearch('acme');
    });
    await advance(SEARCH_DEBOUNCE_MS);
    act(() => {
      result.current.setPage(2);
    });
    await advance(0);
    expect(result.current.page).toBe(2);
    expect(requestedQuery(fetchMock.mock.calls.length - 1)).toEqual({ search: 'acme', page: '2' });
  });
});
