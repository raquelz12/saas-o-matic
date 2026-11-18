import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, totalPages } from './Pagination.tsx';

function renderPagination(page: number, total: number, pageSize = 20) {
  const onPageChange = vi.fn();
  render(<Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />);
  const previous = screen.getByRole<HTMLButtonElement>('button', { name: 'Anterior' });
  const next = screen.getByRole<HTMLButtonElement>('button', { name: 'Siguiente' });
  return { onPageChange, previous, next };
}

describe('totalPages', () => {
  it.each([
    [0, 20, 1],
    [1, 20, 1],
    [20, 20, 1],
    [21, 20, 2],
    [100, 20, 5],
    [101, 100, 2],
  ])('total %i con pageSize %i → %i páginas', (total, pageSize, expected) => {
    expect(totalPages(total, pageSize)).toBe(expected);
  });
});

describe('Pagination', () => {
  it('en la página 1 deshabilita «Anterior»', () => {
    const { previous, next } = renderPagination(1, 45);
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
  });

  it('en la última página, calculada con total y pageSize, deshabilita «Siguiente»', () => {
    const { previous, next } = renderPagination(3, 45);
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);
  });

  it('con total múltiplo de pageSize, la última página es total / pageSize', () => {
    const { next } = renderPagination(2, 40);
    expect(next.disabled).toBe(true);
    expect(screen.getByText('Página 2 de 2')).toBeTruthy();
  });

  it('sin resultados deshabilita los dos botones', () => {
    const { previous, next } = renderPagination(1, 0);
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    expect(screen.getByText('Página 1 de 1')).toBeTruthy();
  });

  it('«Anterior» y «Siguiente» piden la página contigua', () => {
    const { onPageChange, previous, next } = renderPagination(2, 45);
    fireEvent.click(previous);
    fireEvent.click(next);
    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });

  it('muestra la página actual y el total de páginas', () => {
    renderPagination(2, 45);
    expect(screen.getByRole('navigation', { name: 'Paginación' }).textContent).toContain(
      'Página 2 de 3',
    );
  });
});
