import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiBaseUrl, request } from './client.ts';
import { listCustomers } from './customers.ts';
import { saveSimulation } from './simulations.ts';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** `fetch` que solo termina cuando se aborta su `signal`, como el real. */
function hangingFetch(_url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('La promesa no se rechazó');
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_URL', 'http://api.test');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('URL base', () => {
  it('añade /api a VITE_API_URL y quita la barra final', () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/');
    expect(apiBaseUrl()).toBe('http://api.test/api');
  });

  it('usa http://localhost:3000 si VITE_API_URL está vacía', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(apiBaseUrl()).toBe('http://localhost:3000/api');
  });

  it('construye la query sin los parámetros indefinidos ni el search vacío', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], page: 2, pageSize: 20, total: 0 }));
    await listCustomers({ search: '', page: 2 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/api/customers?page=2');
  });
});

describe('respuestas correctas', () => {
  it('devuelve el body JSON de un 2xx', async () => {
    const page = { items: [], page: 1, pageSize: 20, total: 0 };
    fetchMock.mockResolvedValue(jsonResponse(200, page));
    await expect(request('/customers')).resolves.toEqual(page);
  });

  it('un POST envía el body como JSON con su Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 7 }));
    const input = { customerId: 1, users: 15, storageGb: 200, apiCallsPerMonth: 50000 };
    await saveSimulation(input);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://api.test/api/simulations');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init?.body).toBe(JSON.stringify(input));
  });
});

describe('errores con el formato 5.1', () => {
  it('un 422 produce un ApiError con status, code y details', async () => {
    const details = [
      { field: 'taxId', issue: 'INVALID_CHECKSUM' },
      { field: 'email', issue: 'INVALID_FORMAT' },
    ];
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
      }),
    );
    const err = await rejection(request('/customers', { method: 'POST', body: {} }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details,
    });
  });

  it('un 404 conserva su code y details vacío', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, {
        error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] },
      }),
    );
    const err = await rejection(request('/customers/99'));
    expect(err).toMatchObject({ status: 404, code: 'NOT_FOUND', details: [] });
  });
});

describe('NETWORK_ERROR', () => {
  it('un fallo de red produce NETWORK_ERROR con status 0 y details vacío', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await rejection(request('/customers'));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR', details: [] });
  });

  it('un error que no es JSON produce NETWORK_ERROR con su status', async () => {
    fetchMock.mockResolvedValue(new Response('<h1>Bad Gateway</h1>', { status: 502 }));
    const err = await rejection(request('/customers'));
    expect(err).toMatchObject({ status: 502, code: 'NETWORK_ERROR', details: [] });
  });

  it('un 2xx que no es JSON produce NETWORK_ERROR', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    const err = await rejection(request('/customers'));
    expect(err).toMatchObject({ status: 200, code: 'NETWORK_ERROR', details: [] });
  });

  it.each([
    ['sin la clave error', { message: 'boom' }],
    ['sin details', { error: { code: 'X', message: 'boom' } }],
    ['con un detail mal formado', { error: { code: 'X', message: 'boom', details: [{}] } }],
  ])('un error JSON %s produce NETWORK_ERROR', async (_label, body) => {
    fetchMock.mockResolvedValue(jsonResponse(500, body));
    const err = await rejection(request('/customers'));
    expect(err).toMatchObject({ status: 500, code: 'NETWORK_ERROR', details: [] });
  });
});

describe('abort', () => {
  it('abortar el signal rechaza con AbortError y no con ApiError', async () => {
    fetchMock.mockImplementation(hangingFetch);
    const controller = new AbortController();
    const promise = request('/customers', { signal: controller.signal });
    controller.abort();
    const err = await rejection(promise);
    expect(err).not.toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ name: 'AbortError' });
  });

  it('pasa el signal a fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));
    const controller = new AbortController();
    await request('/countries', { signal: controller.signal });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
