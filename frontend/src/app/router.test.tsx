import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrencyProvider } from '../features/currency/CurrencyContext.tsx';
import { createQueryClient } from './queryClient.ts';
import { routes } from './router.tsx';

// El layout pinta el selector de divisa, que pide los tipos: `fetch` queda pendiente.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => undefined)),
  );
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

describe('router', () => {
  it.each([
    ['/', 'Clientes'],
    ['/customers/new', 'Nuevo cliente'],
    ['/customers/42', 'Detalle del cliente'],
  ])('%s renderiza su página', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy();
  });

  it('cada página se pinta dentro del layout, con cabecera, main y pie', () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main').textContent).toContain('Clientes');
    expect(screen.getByRole('contentinfo')).toBeTruthy();
  });

  it('el título de la cabecera enlaza al dashboard', () => {
    renderAt('/customers/new');
    expect(screen.getByRole('link', { name: 'SaaS-O-Matic' }).getAttribute('href')).toBe('/');
  });
});
