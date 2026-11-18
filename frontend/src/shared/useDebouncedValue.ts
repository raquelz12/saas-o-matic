import { useEffect, useState } from 'react';

/**
 * Devuelve `value` cuando lleva `delayMs` sin cambiar (architecture §3, Debounce). Cada cambio
 * reinicia la espera, así que solo cuenta el último. Lo usan el buscador (RF-34, 300 ms) y el
 * preview (RF-38, 250 ms).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
