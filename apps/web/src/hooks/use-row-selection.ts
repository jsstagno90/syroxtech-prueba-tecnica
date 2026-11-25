'use client';

import { useCallback, useMemo, useState } from 'react';

export type RowKey = string | number;

/**
 * Filas elegidas en una tabla para acciones masivas.
 * Se mantienen al cambiar de página; la pantalla decide cuándo limpiarlas (ej. al filtrar).
 */
export function useRowSelection<K extends RowKey = RowKey>() {
  const [selected, setSelected] = useState<ReadonlySet<K>>(() => new Set());

  const clear = useCallback(() => setSelected(new Set()), []);
  const remove = useCallback(
    (keys: K[]) =>
      setSelected((current) => {
        if (!keys.some((key) => current.has(key))) return current;
        const next = new Set(current);
        keys.forEach((key) => next.delete(key));
        return next;
      }),
    [],
  );

  return useMemo(
    () => ({ selected, setSelected, clear, remove, count: selected.size, keys: [...selected] }),
    [selected, clear, remove],
  );
}

export type RowSelection<K extends RowKey = RowKey> = ReturnType<typeof useRowSelection<K>>;
