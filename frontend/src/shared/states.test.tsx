import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState.tsx';
import { ErrorState } from './ErrorState.tsx';
import { LoadingState } from './LoadingState.tsx';

describe('LoadingState', () => {
  it('muestra un estado de carga con el texto por defecto', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status').textContent).toBe('Cargando…');
  });

  it('acepta un texto propio', () => {
    render(<LoadingState label="Cargando clientes…" />);
    expect(screen.getByRole('status').textContent).toBe('Cargando clientes…');
  });
});

describe('ErrorState', () => {
  it('muestra un aviso con el mensaje por defecto', () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByRole('alert').textContent).toContain('No se han podido cargar los datos.');
  });

  it('el botón de reintento llama a su callback', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Falló la búsqueda" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toContain('Falló la búsqueda');
  });

  it('sin callback no hay botón de reintento', () => {
    render(<ErrorState message="Cliente no encontrado" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('pinta el mensaje como texto, sin interpretarlo como HTML', () => {
    render(<ErrorState message="<b>x</b>" />);
    expect(screen.getByRole('alert').textContent).toContain('<b>x</b>');
    expect(screen.getByRole('alert').querySelector('b')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('muestra su mensaje', () => {
    render(<EmptyState message="No hay clientes" />);
    expect(screen.getByText('No hay clientes')).toBeTruthy();
  });
});
