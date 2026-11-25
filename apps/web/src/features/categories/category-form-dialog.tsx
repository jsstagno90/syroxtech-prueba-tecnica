'use client';

import { useMemo } from 'react';
import { createCategorySchema, type CategoryResponse, type CreateCategoryInput } from '@admin/shared';
import { FormDialog } from '@/components/crud/form-dialog';
import { NumberField, SelectField, TextField } from '@/components/form/fields';
import { buildCategoryPaths, categoryHooks, collectDescendantIds } from './api';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryResponse | null;
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const { data: options = [] } = categoryHooks.useOptions();
  const create = categoryHooks.useCreate();
  const update = categoryHooks.useUpdate();

  // Al editar, una categoría no puede elegirse a sí misma ni a sus hijas como padre.
  const parentOptions = useMemo(() => {
    const excluded = category ? collectDescendantIds(options, category.id) : new Set<number>();
    return buildCategoryPaths(options)
      .filter((option) => !excluded.has(option.id))
      .map((option) => ({ value: option.id, label: option.path }));
  }, [options, category]);

  const defaultValues: CreateCategoryInput = category
    ? { name: category.name, parentId: category.parentId, position: category.position }
    : { name: '', parentId: null, position: 0 };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      description={category ? undefined : 'Las categorías sin padre aparecen como principales.'}
      schema={createCategorySchema}
      defaultValues={defaultValues}
      submitLabel={category ? 'Guardar cambios' : 'Crear'}
      onSubmit={(values) => (category ? update.mutateAsync({ id: category.id, data: values }) : create.mutateAsync(values))}
    >
      {(form) => (
        <>
          <TextField control={form.control} name="name" label="Nombre" placeholder="Nombre de la categoría" required autoFocus />
          <SelectField
            control={form.control}
            name="parentId"
            label="Categoría padre"
            noneLabel="Principal (sin padre)"
            options={parentOptions}
          />
          <NumberField
            control={form.control}
            name="position"
            label="Posición"
            min={0}
            step={1}
            description="Orden en el que se muestra (menor primero)."
          />
        </>
      )}
    </FormDialog>
  );
}
