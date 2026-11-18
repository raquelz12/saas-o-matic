import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Currency } from './conversion.ts';
import { CURRENCY_STORAGE_KEY, CurrencyProvider } from './CurrencyContext.tsx';
import { Money } from './Money.tsx';
import { MoneyTotal } from './MoneyTotal.tsx';

/** Salida esperada: la de `Intl` en `es-ES`, nunca un literal. */
function intlEsES(value: string, currency: Currency): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(value as Intl.StringNumericLiteral);
}

/** Proveedor de tipos simulado: la API de cambio responde con estos tipos mock. */
function fxResponse(rates: Partial<Record<Currency, number>>): Response {
  const body = {
    result: 'success',
    time_last_update_utc: 'Wed, 18 Nov 2026 00:02:31 +0000',
    time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
    rates: { EUR: 1, USD: 1.085, GBP: 0.865, JPY: 162.37, ...rates },
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

/** Base 140,00 € e impuesto 29,40 € (RB-15), pintados como `base + impuesto = total`. */
function renderQuote(currency: Currency) {
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CurrencyProvider>
        <p data-testid="quote">
          <Money cents={14_000} /> + <Money cents={2_940} /> ={' '}
          <MoneyTotal baseCents={14_000} taxCents={2_940} />
        </p>
      </CurrencyProvider>
    </QueryClientProvider>,
  );
}

async function expectQuote(text: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('quote').textContent).toBe(text);
  });
}

describe('MoneyTotal', () => {
  it('CA-97: JPY 162,37 → 22.732 + 4774 = 27.506 ¥, sin decimales y en es-ES', async () => {
    fetchMock.mockResolvedValue(fxResponse({ JPY: 162.37 }));
    renderQuote('JPY');
    await expectQuote(
      `${intlEsES('22732', 'JPY')} + ${intlEsES('4774', 'JPY')} = ${intlEsES('27506', 'JPY')}`,
    );
  });

  it('CA-98: USD 1,0850 → 151,90 + 31,90 = 183,80 $', async () => {
    fetchMock.mockResolvedValue(fxResponse({ USD: 1.085 }));
    renderQuote('USD');
    await expectQuote(
      `${intlEsES('151.90', 'USD')} + ${intlEsES('31.90', 'USD')} = ${intlEsES('183.80', 'USD')}`,
    );
  });

  it('RB-15: GBP 0,8650 → 121,10 + 25,43 = 146,53', async () => {
    fetchMock.mockResolvedValue(fxResponse({ GBP: 0.865 }));
    renderQuote('GBP');
    await expectQuote(
      `${intlEsES('121.10', 'GBP')} + ${intlEsES('25.43', 'GBP')} = ${intlEsES('146.53', 'GBP')}`,
    );
  });

  it('RB-16: sin tipos se muestra todo en EUR aunque la divisa elegida sea otra', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderQuote('JPY');
    await expectQuote(
      `${intlEsES('140.00', 'EUR')} + ${intlEsES('29.40', 'EUR')} = ${intlEsES('169.40', 'EUR')}`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('mientras cargan los tipos se muestra en EUR', () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    renderQuote('USD');
    expect(screen.getByTestId('quote').textContent).toBe(
      `${intlEsES('140.00', 'EUR')} + ${intlEsES('29.40', 'EUR')} = ${intlEsES('169.40', 'EUR')}`,
    );
  });
});
