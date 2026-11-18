import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Currency } from './conversion.ts';
import { CURRENCY_STORAGE_KEY, CurrencyProvider } from './CurrencyContext.tsx';
import { Money } from './Money.tsx';
import { fxRatesKey } from './useFxRates.ts';

/** Salida esperada: la de `Intl` en `es-ES`, nunca un literal. */
function intlEsES(value: string, currency: Currency): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(value as Intl.StringNumericLiteral);
}

function fxResponse(): Response {
  const body = {
    result: 'success',
    time_last_update_utc: 'Wed, 18 Nov 2026 00:02:31 +0000',
    time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
    // EUR distinto de 1 para comprobar que EUR nunca se convierte (RB-16).
    rates: { EUR: 1.5, USD: 1.005, GBP: 0.865, JPY: 162.37 },
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderMoney(cents: number, currency: Currency) {
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CurrencyProvider>
        <p data-testid="money">
          <Money cents={cents} />
        </p>
      </CurrencyProvider>
    </QueryClientProvider>,
  );
  return client;
}

async function expectMoney(text: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('money').textContent).toBe(text);
  });
}

describe('Money', () => {
  it('convierte con big.js y half-up: 1,00 € × 1,005 = 1,01 $ (RF-42)', async () => {
    fetchMock.mockResolvedValue(fxResponse());
    renderMoney(100, 'USD');
    await expectMoney(intlEsES('1.01', 'USD'));
  });

  it('un subtotal de tramo se convierte y redondea por separado (RB-14)', async () => {
    fetchMock.mockResolvedValue(fxResponse());
    renderMoney(4_500, 'JPY');
    await expectMoney(intlEsES('7307', 'JPY'));
  });

  it('EUR no se convierte aunque haya tipos (RB-16)', async () => {
    fetchMock.mockResolvedValue(fxResponse());
    const client = renderMoney(14_000, 'EUR');
    await waitFor(() => {
      expect(client.getQueryData(fxRatesKey)).toBeDefined();
    });
    expect(screen.getByTestId('money').textContent).toBe(intlEsES('140.00', 'EUR'));
  });

  it('RB-16: sin tipos se muestra en EUR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderMoney(14_000, 'USD');
    await expectMoney(intlEsES('140.00', 'EUR'));
  });
});
