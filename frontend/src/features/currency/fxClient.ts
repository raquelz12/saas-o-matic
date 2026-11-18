import { z } from 'zod';
import type { Currency } from './conversion.ts';

// Cliente de la API pública de tipos de cambio (RF-41). Es otra API distinta del backend,
// así que vive en la feature y no en `api/` (architecture §3). Timeout de 5 s (RF-43).

const DEFAULT_FX_URL = 'https://open.er-api.com/v6/latest/EUR';
export const FX_TIMEOUT_MS = 5000;

/** Tipos con base EUR: 1 EUR = `rates[currency]`. */
export interface FxRates {
  rates: Record<Currency, number>;
  /** Fecha de la tasa (`time_last_update_utc`), para mostrarla en `es-ES` (RF-41). */
  lastUpdateUtc: string;
  /** Segundos Unix hasta los que vale la caché (`time_next_update_unix`). */
  nextUpdateUnix: number;
}

/** Fallo de la API de cambio: HTTP no 2xx, body no JSON o respuesta que no cumple el schema. */
export class FxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FxError';
  }
}

const rate = z.number().finite().positive();

// Las demás divisas de la respuesta se descartan.
const fxResponseSchema = z.object({
  result: z.literal('success'),
  time_last_update_utc: z.string(),
  time_next_update_unix: z.number().int(),
  rates: z.object({ EUR: rate, USD: rate, GBP: rate, JPY: rate }),
});

/** `VITE_FX_URL`; por defecto, el valor de `.env.example`. */
export function fxUrl(): string {
  const raw: unknown = import.meta.env.VITE_FX_URL;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : DEFAULT_FX_URL;
}

function withTimeout(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(FX_TIMEOUT_MS);
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch (error) {
    // Un abort o el timeout durante la lectura del body se relanzan tal cual.
    if (error instanceof DOMException) throw error;
    throw new FxError('Exchange rates response is not JSON');
  }
}

/**
 * Pide los tipos de cambio. El abort de `signal` y el timeout rechazan con el error nativo
 * (`AbortError` / `TimeoutError`); cualquier otro fallo, con `FxError`.
 */
export async function fetchFxRates(signal?: AbortSignal): Promise<FxRates> {
  const res = await fetch(fxUrl(), { signal: withTimeout(signal) });
  if (!res.ok) throw new FxError(`Exchange rates request failed with status ${res.status}`);
  const parsed = fxResponseSchema.safeParse(await readJson(res));
  if (!parsed.success) throw new FxError('Invalid exchange rates response');
  const { rates, time_last_update_utc, time_next_update_unix } = parsed.data;
  return { rates, lastUpdateUtc: time_last_update_utc, nextUpdateUnix: time_next_update_unix };
}
