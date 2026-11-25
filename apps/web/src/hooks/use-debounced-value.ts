'use client';

import { useEffect, useState } from 'react';

/** Devuelve el valor recién cuando dejó de cambiar por `delay` ms (ideal para buscadores). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
