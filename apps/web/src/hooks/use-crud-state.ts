'use client';

import { useCallback, useState } from 'react';

/**
 * Qué modal está abierto en una pantalla CRUD: el formulario (crear o editar)
 * y la confirmación de borrado. Evita repetir los mismos useState en cada página.
 */
export function useCrudState<T>() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditing(item);
    setFormOpen(true);
  }, []);

  const askDelete = useCallback((item: T) => setDeleting(item), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  return { formOpen, setFormOpen, editing, deleting, openCreate, openEdit, askDelete, closeDelete };
}
