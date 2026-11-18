import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FX_TIMEOUT_MS, FxError, fetchFxRates, fxUrl } from './fxClient.ts';

const VALID = {
  result: 'success',
  time_last_update_utc: 'Wed, 18 Nov 2026 00:02:31 +0000',
  time_next_update_unix: 1795478400,
  base_code: 'EUR',
  rates: { EUR: 1, USD: 1.0812, GBP: 0.8571, JPY: 162.38, CHF: 0.94 },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fxUrl', () => {
  it('usa VITE_FX_URL si está definida', () => {
    vi.stubEnv('VITE_FX_URL', ' https://fx.example/latest/EUR ');
    expect(fxUrl()).toBe('https://fx.example/latest/EUR');
  });

  it('usa open.er-api por defecto si está vacía', () => {
    vi.stubEnv('VITE_FX_URL', '');
    expect(fxUrl()).toBe('https://open.er-api.com/v6/latest/EUR');
  });
});

describe('fetchFxRates', () => {
  it('devuelve las cuatro divisas, la fecha y la caducidad', async () => {
    fetchMock.mockResolvedValue(jsonResponse(VALID));
    await expect(fetchFxRates()).resolves.toEqual({
      rates: { EUR: 1, USD: 1.0812, GBP: 0.8571, JPY: 162.38 },
      lastUpdateUtc: VALID.time_last_update_utc,
      nextUpdateUnix: VALID.time_next_update_unix,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      fxUrl(),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it.each([
    ['result distinto de success', { ...VALID, result: 'error' }],
    ['falta una divisa', { ...VALID, rates: { EUR: 1, USD: 1.08, GBP: 0.85 } }],
    ['tipo igual a 0', { ...VALID, rates: { ...VALID.rates, GBP: 0 } }],
    ['tipo negativo', { ...VALID, rates: { ...VALID.rates, USD: -1 } }],
    ['tipo como string', { ...VALID, rates: { ...VALID.rates, JPY: '162.38' } }],
    ['tipo null (Infinity o NaN serializados)', { ...VALID, rates: { ...VALID.rates, USD: null } }],
    ['falta time_next_update_unix', { ...VALID, time_next_update_unix: undefined }],
    ['falta time_last_update_utc', { ...VALID, time_last_update_utc: undefined }],
    ['body que no es objeto', [1, 2, 3]],
  ])('respuesta inválida (%s) → FxError', async (_name, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    await expect(fetchFxRates()).rejects.toBeInstanceOf(FxError);
  });

  it('HTTP no 2xx → FxError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(VALID, 503));
    await expect(fetchFxRates()).rejects.toBeInstanceOf(FxError);
  });

  it('body que no es JSON → FxError', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }));
    await expect(fetchFxRates()).rejects.toBeInstanceOf(FxError);
  });

  it('fallo de red → se propaga el error de fetch', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchFxRates()).rejects.toBeInstanceOf(TypeError);
  });

  // `AbortSignal.timeout` usa temporizadores internos de Node que Vitest no falsea, así que se
  // sustituye por una señal propia que se dispara con un `setTimeout` falso del mismo plazo.
  it(`a los ${FX_TIMEOUT_MS} ms se aborta la petición con TimeoutError`, async () => {
    vi.useFakeTimers();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(new DOMException('Timed out', 'TimeoutError'));
      }, ms);
      return controller.signal;
    });
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => {
            reject(signal.reason as Error);
          });
        }),
    );
    const result = fetchFxRates();
    const assertion = expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(FX_TIMEOUT_MS - 1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(timeoutSpy).toHaveBeenCalledWith(FX_TIMEOUT_MS);
    timeoutSpy.mockRestore();
  });

  it('el abort del signal de TanStack también cancela la petición', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    const result = fetchFxRates(controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
