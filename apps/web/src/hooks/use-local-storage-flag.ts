'use client';

import { useCallback, useSyncExternalStore } from 'react';

const EVENT = 'local-storage-flag';

function read(key: string) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false; // Sin localStorage (modo privado, iframes): valor por defecto.
  }
}

/**
 * Booleano persistido en localStorage (ej. sidebar contraída).
 * En el servidor siempre vale `false`, así no hay diferencias de hidratación.
 */
export function useLocalStorageFlag(key: string) {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('storage', onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, String(next));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, setValue] as const;
}
