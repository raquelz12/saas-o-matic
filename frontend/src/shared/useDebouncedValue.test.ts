import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDebounced(initial: string, delayMs = 300) {
  return renderHook(({ value }) => useDebouncedValue(value, delayMs), {
    initialProps: { value: initial },
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useDebouncedValue', () => {
  it('el valor inicial se devuelve al momento', () => {
    const { result } = renderDebounced('acme');
    expect(result.current).toBe('acme');
  });

  it('el valor solo cambia 300 ms después del último cambio', () => {
    const { result, rerender } = renderDebounced('');
    rerender({ value: 'acme' });
    advance(299);
    expect(result.current).toBe('');
    advance(1);
    expect(result.current).toBe('acme');
  });

  it('cada cambio reinicia la espera: solo cuenta el último valor', () => {
    const { result, rerender } = renderDebounced('');
    rerender({ value: 'a' });
    advance(200);
    rerender({ value: 'ac' });
    advance(200);
    rerender({ value: 'acme' });
    advance(299);
    expect(result.current).toBe('');
    advance(1);
    expect(result.current).toBe('acme');
  });

  it('respeta el plazo que recibe', () => {
    const { result, rerender } = renderDebounced('', 250);
    rerender({ value: 'x' });
    advance(249);
    expect(result.current).toBe('');
    advance(1);
    expect(result.current).toBe('x');
  });

  it('al desmontar se cancela el temporizador pendiente', () => {
    const { rerender, unmount } = renderDebounced('');
    rerender({ value: 'acme' });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
