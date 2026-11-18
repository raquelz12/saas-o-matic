import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, Page } from '../api/types.ts';
import { createQueryClient } from '../app/queryClient.ts';
import { EMPTY_MESSAGE, ERROR_MESSAGE } from '../features/customers/CustomerList.tsx';
import { Dashboard } from './Dashboard.tsx';

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 7,
    companyName: 'Acme Software SL',
    taxId: 'B12345674',
    email: 'billing@acme.example',
    country: 'ES',
    plan: 'BUSINESS',
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

function pageResponse(items: Customer[], page = 1, total = items.length): Response {
  const body: Page<Customer> = { items, page, pageSize: 20, total };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

/** Query string de la última llamada a `fetch`, como objeto. */
function lastQuery(): Record<string, string> {
  const url = fetchMock.mock.calls.at(-1)?.[0];
  return Object.fromEntries(new URL(String(url)).searchParams);
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// El dashboard con las rutas a las que enlaza, sin el layout (no pide tipos de cambio).
function renderDashboard() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Dashboard /> },
      { path: '/customers/new', element: <h1>Alta</h1> },
      { path: '/customers/:id', element: <h1>Detalle</h1> },
    ],
    { initialEntries: ['/'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function searchInput(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('searchbox', {
    name: 'Buscar por empresa o identificador fiscal',
  });
}

describe('Dashboard', () => {
  it('CA-90: al escribir en el buscador se muestran los resultados paginados del backend', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([customer()], 1, 1));
    fetchMock.mockResolvedValueOnce(
      pageResponse([customer({ id: 9, companyName: 'Globex Corp' })], 1, 45),
    );
    fetchMock.mockResolvedValueOnce(
      pageResponse([customer({ id: 30, companyName: 'Globex Iberia' })], 2, 45),
    );
    renderDashboard();
    await screen.findByText('Acme Software SL');

    fireEvent.change(searchInput(), { target: { value: 'globex' } });
    expect(await screen.findByText('Globex Corp')).toBeTruthy();
    expect(lastQuery()).toEqual({ search: 'globex', page: '1' });
    expect(screen.queryByText('Acme Software SL')).toBeNull();
    const pagination = screen.getByRole('navigation', { name: 'Paginación' });
    expect(pagination.textContent).toContain('Página 1 de 3');

    fireEvent.click(within(pagination).getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Globex Iberia')).toBeTruthy();
    expect(lastQuery()).toEqual({ search: 'globex', page: '2' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('CA-105: un nombre con <script> se pinta como texto en la tarjeta del listado', async () => {
    const name = '<script>alert(1)</script>';
    fetchMock.mockResolvedValue(pageResponse([customer({ companyName: name })]));
    renderDashboard();
    const list = await screen.findByRole('list', { name: 'Clientes' });
    expect(within(list).getByRole('heading', { level: 2 }).textContent).toBe(name);
    expect(list.querySelector('script')).toBeNull();
  });

  it('la tarjeta muestra empresa, identificador fiscal, país en es-ES y plan, y enlaza al detalle', async () => {
    fetchMock.mockResolvedValue(pageResponse([customer()]));
    const router = renderDashboard();
    const card = await screen.findByRole('link', { name: /Acme Software SL/ });
    const country = new Intl.DisplayNames('es-ES', { type: 'region' }).of('ES') ?? '';
    for (const text of ['B12345674', country, 'BUSINESS']) {
      expect(card.textContent).toContain(text);
    }
    expect(card.textContent).not.toContain('billing@acme.example');
    expect(card.getAttribute('href')).toBe('/customers/7');

    fireEvent.click(card);
    expect(await screen.findByRole('heading', { name: 'Detalle' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/customers/7');
  });

  it('mientras carga muestra el estado de carga', () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    renderDashboard();
    expect(screen.getByRole('status').textContent).toBe('Cargando clientes…');
  });

  it('si falla muestra el error y «Reintentar» vuelve a pedir los clientes', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValueOnce(pageResponse([customer()]));
    renderDashboard();
    expect((await screen.findByRole('alert')).textContent).toContain(ERROR_MESSAGE);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Acme Software SL')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sin resultados muestra el estado vacío', async () => {
    fetchMock.mockResolvedValue(pageResponse([]));
    renderDashboard();
    expect(await screen.findByText(EMPTY_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
  });

  it('el botón de alta lleva al formulario de nuevo cliente', async () => {
    fetchMock.mockResolvedValue(pageResponse([]));
    renderDashboard();
    const link = screen.getByRole('link', { name: 'Nuevo cliente' });
    expect(link.getAttribute('href')).toBe('/customers/new');
    fireEvent.click(link);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alta' })).toBeTruthy();
    });
  });

  it('el buscador no admite más de 100 caracteres (spec 5.4)', () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    renderDashboard();
    expect(searchInput().maxLength).toBe(100);
  });
});
