import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './router.tsx';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
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
