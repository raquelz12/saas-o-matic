import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../api/queryKeys.ts';
import { createQueryClient } from '../app/queryClient.ts';
import { GENERAL_ERROR } from '../features/customers/customerFormErrors.ts';
import { COUNTRIES_ERROR } from '../features/customers/NewCustomerForm.tsx';
import { NewCustomer } from './NewCustomer.tsx';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const apiError = (status: number, code: string, details: { field: string; issue: string }[]) =>
  json(status, { error: { code, message: 'x', details } });
const COUNTRIES = {
  items: [
    { code: 'DE', taxRateBp: 1900 },
    { code: 'ES', taxRateBp: 2100 },
  ],
};
/** Valores válidos tal como se escriben: el formulario los envía sin normalizar. */
const INPUT = {
  companyName: '  Acme   SL ',
  taxId: 'B-1234 5674',
  email: 'a@acme.es',
  country: 'ES',
  plan: 'BUSINESS',
};
const CREATED = { ...INPUT, id: 42, createdAt: '2026-11-18T10:00:00.000Z' };

const fetchMock = vi.fn<typeof fetch>();
let createResponse: () => Promise<Response>;

beforeEach(() => {
  createResponse = () => Promise.resolve(json(201, CREATED));
  fetchMock.mockReset();
  fetchMock.mockImplementation((input, init) =>
    init?.method === 'POST' ? createResponse() : Promise.resolve(json(200, COUNTRIES)),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/customers/new', element: <NewCustomer /> },
      { path: '/customers/:id', element: <h1>Detalle</h1> },
    ],
    { initialEntries: ['/customers/new'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient };
}

const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label);
const type = (label: string, value: string) => {
  fireEvent.change(field(label), { target: { value } });
};
const submit = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));
};
const postCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
/** Texto del error enlazado al campo por `aria-describedby`. */
const errorOf = (label: string) => {
  const id = field(label).getAttribute('aria-describedby');
  return id === null ? null : document.getElementById(id)?.textContent;
};

async function fillValid(taxId = INPUT.taxId) {
  await screen.findByRole('option', { name: 'España' });
  type('Nombre de empresa', INPUT.companyName);
  type('Identificador fiscal', taxId);
  type('Email', INPUT.email);
  type('País', INPUT.country);
  type('Plan', INPUT.plan);
}

describe('NewCustomer', () => {
  it('CA-96: los países vienen de GET /countries con nombres localizados, y los planes del enum', async () => {
    renderPage();
    const country = field('País');
    await within(country).findByRole('option', { name: 'Alemania' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/api\/countries$/);
    const names = (select: HTMLElement) =>
      within(select)
        .getAllByRole('option')
        .slice(1)
        .map((o) => [o.getAttribute('value'), o.textContent]);
    expect(names(country)).toEqual([
      ['DE', 'Alemania'],
      ['ES', 'España'],
    ]);
    expect(names(field('Plan'))).toEqual([
      ['STARTER', 'Starter'],
      ['BUSINESS', 'Business'],
      ['ENTERPRISE', 'Enterprise'],
    ]);
  });

  it('CA-94: un CIF inválido se envía sin validar su algoritmo y el error se muestra junto a taxId', async () => {
    createResponse = () =>
      Promise.resolve(
        apiError(422, 'VALIDATION_ERROR', [{ field: 'taxId', issue: 'INVALID_CHECKSUM' }]),
      );
    renderPage();
    await fillValid('B12345670');
    submit();
    await waitFor(() => {
      expect(errorOf('Identificador fiscal')).toBe('El identificador fiscal no es válido.');
    });
    const body: unknown = JSON.parse(String(postCalls()[0]?.[1]?.body));
    expect(body).toEqual({ ...INPUT, taxId: 'B12345670' });
    expect(field('Identificador fiscal').getAttribute('aria-invalid')).toBe('true');
    expect(errorOf('Email')).toBeNull();
  });

  it('CA-95: el aviso del 409 se muestra en taxId', async () => {
    createResponse = () =>
      Promise.resolve(apiError(409, 'DUPLICATE', [{ field: 'taxId', issue: 'DUPLICATE' }]));
    renderPage();
    await fillValid();
    submit();
    await waitFor(() => {
      expect(errorOf('Identificador fiscal')).toBe(
        'Ya existe un cliente con este identificador fiscal en este país.',
      );
    });
    expect(screen.queryByText(GENERAL_ERROR)).toBeNull();
  });

  it('valida los obligatorios en el cliente sin enviar, y el error se quita al editar', async () => {
    renderPage();
    await screen.findByRole('option', { name: 'España' });
    type('Nombre de empresa', '   ');
    submit();
    for (const label of ['Nombre de empresa', 'Identificador fiscal', 'Email', 'País', 'Plan']) {
      expect(errorOf(label)).toBe('Este campo es obligatorio.');
    }
    expect(postCalls()).toHaveLength(0);
    type('Email', 'a');
    expect(errorOf('Email')).toBeNull();
    expect(errorOf('Plan')).toBe('Este campo es obligatorio.');
  });

  it('mide las longitudes tras trim y colapso; el máximo del identificador lo decide el backend', async () => {
    renderPage();
    await fillValid('1   2 ');
    type('Nombre de empresa', '  A  ');
    type('Email', `${'a'.repeat(247)}@acme.es`);
    submit();
    expect(errorOf('Nombre de empresa')).toBe('Debe tener entre 2 y 100 caracteres.');
    expect(errorOf('Identificador fiscal')).toBe('Debe tener entre 5 y 20 caracteres.');
    expect(errorOf('Email')).toBe('Debe tener como máximo 254 caracteres.');
    expect(postCalls()).toHaveLength(0);

    type('Nombre de empresa', ` ${'a '.repeat(50)}`);
    type('Identificador fiscal', 'B-12.34.56.74 - 0 0 0 0 0');
    type('Email', 'a@acme.es');
    submit();
    await waitFor(() => {
      expect(postCalls()).toHaveLength(1);
    });
  });

  it('tras un 201 navega al detalle del cliente creado e invalida la búsqueda', async () => {
    const { router, queryClient } = renderPage();
    const listKey = queryKeys.customers.list({ search: '', page: 1 });
    queryClient.setQueryData(listKey, { items: [], page: 1, pageSize: 20, total: 0 });
    await fillValid();
    submit();
    await screen.findByRole('heading', { name: 'Detalle' });
    expect(router.state.location.pathname).toBe('/customers/42');
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });

  it('deshabilita el botón mientras se envía', async () => {
    createResponse = () => new Promise(() => undefined);
    renderPage();
    await fillValid();
    submit();
    const button = await screen.findByRole('button', { name: 'Creando…' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('un error sin campo muestra el aviso general y conserva los valores', async () => {
    createResponse = () => Promise.resolve(apiError(500, 'INTERNAL_ERROR', []));
    renderPage();
    await fillValid();
    submit();
    await screen.findByText(GENERAL_ERROR);
    expect(field('Nombre de empresa').value).toBe(INPUT.companyName);
  });

  it('si fallan los países, muestra el error y reintenta a mano', async () => {
    fetchMock.mockResolvedValueOnce(apiError(500, 'INTERNAL_ERROR', []));
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(COUNTRIES_ERROR);
    expect(field('País')).toHaveProperty('disabled', true);
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('option', { name: 'España' });
    expect(field('País')).toHaveProperty('disabled', false);
  });
});
