import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrencyProvider } from '../features/currency/CurrencyContext.tsx';
import { FX_ATTRIBUTION_URL } from './Layout.tsx';
import { createQueryClient } from './queryClient.ts';
import { routes } from './router.tsx';

function fxResponse(): Response {
  const body = {
    result: 'success',
    time_last_update_utc: 'Wed, 18 Nov 2026 00:02:31 +0000',
    time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
    rates: { EUR: 1, USD: 1.085, GBP: 0.865, JPY: 162.37 },
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve(fxResponse()));
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

function currencySelect(): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>('combobox', { name: 'Divisa' });
}

describe('Layout', () => {
  it('la divisa elegida persiste al navegar entre dos rutas', async () => {
    renderAt('/customers/new');
    await waitFor(() => {
      expect(currencySelect().disabled).toBe(false);
    });
    fireEvent.change(currencySelect(), { target: { value: 'USD' } });

    fireEvent.click(screen.getByRole('link', { name: 'SaaS-O-Matic' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Clientes' })).toBeTruthy();
    expect(currencySelect().value).toBe('USD');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('el pie enlaza a la atribución de la API de tipos de cambio (RF-41)', () => {
    renderAt('/');
    const footer = screen.getByRole('contentinfo');
    const link = screen.getByRole('link', { name: 'Rates By Exchange Rate API' });
    expect(footer.contains(link)).toBe(true);
    expect(link.getAttribute('href')).toBe(FX_ATTRIBUTION_URL);
  });

  it('el selector de divisa está en la cabecera', () => {
    renderAt('/');
    expect(screen.getByRole('banner').contains(currencySelect())).toBe(true);
  });
});
