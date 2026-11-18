import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENCY_STORAGE_KEY, CurrencyProvider } from './CurrencyContext.tsx';
import { CurrencySelector, FX_UNAVAILABLE_MESSAGE, formatRateDate } from './CurrencySelector.tsx';
import { Money } from './Money.tsx';

const LAST_UPDATE = 'Wed, 18 Nov 2026 00:02:31 +0000';

function fxResponse(): Response {
  const body = {
    result: 'success',
    time_last_update_utc: LAST_UPDATE,
    time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
    rates: { EUR: 1, USD: 1.085, GBP: 0.865, JPY: 162.37 },
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

/** Salida esperada de la fecha: la de `Intl` en `es-ES` y hora local, no un literal. */
function expectedDate(utc: string): string {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(utc),
  );
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Misma configuración que `app/queryClient.ts`, que una feature no puede importar.
function renderSelector() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CurrencyProvider>
        <CurrencySelector />
        <p data-testid="amount">
          <Money cents={14_000} />
        </p>
      </CurrencyProvider>
    </QueryClientProvider>,
  );
}

function select(): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>('combobox', { name: 'Divisa' });
}

describe('CurrencySelector', () => {
  it('CA-100: con la API de cambio lenta, el selector muestra un estado de carga', () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    renderSelector();
    expect(screen.getByRole('status').textContent).toBe('Cargando tipos de cambio…');
    expect(select().disabled).toBe(true);
  });

  it('CA-101: si la API falla, aviso, importes en EUR, selector deshabilitado y reintento', async () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'USD');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderSelector();
    expect((await screen.findByRole('alert')).textContent).toContain(FX_UNAVAILABLE_MESSAGE);
    expect(select().disabled).toBe(true);
    expect(select().value).toBe('EUR');
    expect(screen.getByTestId('amount').textContent).toContain('€');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    // La elección guardada no se sobrescribe (architecture §3).
    expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('USD');
  });

  it('CA-102: tras el fallo, al reintentar con la API ya disponible se habilita el selector', async () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'USD');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValueOnce(fxResponse());
    renderSelector();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    await waitFor(() => {
      expect(select().disabled).toBe(false);
    });
    expect(select().value).toBe('USD');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('CA-104: con los tipos cargados se ve la fecha de la tasa en es-ES', async () => {
    fetchMock.mockResolvedValue(fxResponse());
    renderSelector();
    expect(await screen.findByText(`Tipos del ${expectedDate(LAST_UPDATE)}`)).toBeTruthy();
    expect(select().disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('cambiar de divisa la guarda en localStorage', async () => {
    fetchMock.mockResolvedValue(fxResponse());
    renderSelector();
    await waitFor(() => {
      expect(select().disabled).toBe(false);
    });
    fireEvent.change(select(), { target: { value: 'GBP' } });
    expect(select().value).toBe('GBP');
    expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('GBP');
  });

  it('un valor guardado que no es una divisa válida da EUR', async () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'CHF');
    fetchMock.mockResolvedValue(fxResponse());
    renderSelector();
    await waitFor(() => {
      expect(select().disabled).toBe(false);
    });
    expect(select().value).toBe('EUR');
  });

  it('un localStorage que lanza error no rompe la aplicación', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    fetchMock.mockResolvedValue(fxResponse());
    renderSelector();
    await waitFor(() => {
      expect(select().disabled).toBe(false);
    });
    expect(select().value).toBe('EUR');
    fireEvent.change(select(), { target: { value: 'JPY' } });
    expect(select().value).toBe('JPY');
  });
});

describe('formatRateDate', () => {
  it('formatea en es-ES y hora local; si no es una fecha, undefined', () => {
    expect(formatRateDate(LAST_UPDATE)).toBe(expectedDate(LAST_UPDATE));
    expect(formatRateDate('no es una fecha')).toBeUndefined();
  });
});
