import type { ErrorDetail } from './types.ts';

// Cliente HTTP del backend (architecture §3): único sitio con `fetch` a nuestra API.
// Errores en el formato 5.1 → `ApiError`. Fallo de red, body no JSON o error sin la forma 5.1
// → `ApiError` con `NETWORK_ERROR`, código propio del frontend (R-91). Un abort se relanza tal cual.

const DEFAULT_API_URL = 'http://localhost:3000';
const NETWORK_ERROR = 'NETWORK_ERROR';
const NETWORK_MESSAGE = 'Network error or invalid response';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(status: number, code: string, message: string, details: ErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type QueryValue = string | number | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

/** `VITE_API_URL` sin barra final + `/api`; por defecto, el valor de `.env.example`. */
export function apiBaseUrl(): string {
  const raw: unknown = import.meta.env.VITE_API_URL;
  const base = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : DEFAULT_API_URL;
  return `${base.replace(/\/+$/, '')}/api`;
}

function buildUrl(path: string, query: Record<string, QueryValue> | undefined): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.append(key, String(value));
  }
  const qs = params.toString();
  return `${apiBaseUrl()}${path}${qs === '' ? '' : `?${qs}`}`;
}

function networkError(status: number): ApiError {
  return new ApiError(status, NETWORK_ERROR, NETWORK_MESSAGE, []);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrorDetail(value: unknown): value is ErrorDetail {
  return isRecord(value) && typeof value.field === 'string' && typeof value.issue === 'string';
}

/** Interpreta un body de error con el formato 5.1; si no lo cumple, `NETWORK_ERROR`. */
export function toApiError(status: number, body: unknown): ApiError {
  const error = isRecord(body) ? body.error : undefined;
  if (
    !isRecord(error) ||
    typeof error.code !== 'string' ||
    typeof error.message !== 'string' ||
    !Array.isArray(error.details) ||
    !error.details.every(isErrorDetail)
  ) {
    return networkError(status);
  }
  return new ApiError(status, error.code, error.message, error.details);
}

/** Si la petición se abortó, relanza el error original; si no, lo convierte en `NETWORK_ERROR`. */
function rethrowUnlessAborted(
  err: unknown,
  signal: AbortSignal | undefined,
  status: number,
): never {
  if (signal?.aborted) throw err;
  throw networkError(status);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const init: RequestInit = { method, signal: signal ?? null };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), init);
  } catch (err) {
    rethrowUnlessAborted(err, signal, 0);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (err) {
    rethrowUnlessAborted(err, signal, response.status);
  }

  if (!response.ok) throw toApiError(response.status, parsed);
  // Respuesta 2xx de nuestro propio backend: se confía en el contrato (spec 5.2), sin validarla.
  return parsed as T;
}
