'use client';

import { useState } from 'react';
import { Eye, EyeOff, FolderTree, Loader2, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { FormDialog } from '@/components/crud/form-dialog';
import { SelectField, type SelectOption } from '@/components/form/fields';
import { Button } from '@/components/ui/button';
import { useBulkDeleteProducts, useBulkUpdateProducts } from './api';

const categorySchema = z.object({
  categoryId: z.number({ error: 'Elegí una categoría' }).int().positive('Elegí una categoría'),
});
const brandSchema = z.object({
  brandId: z.number({ error: 'Elegí una marca o "Sin marca"' }).int().positive().nullable(),
});

/** "1 producto" / "3 productos". */
export const productCount = (count: number) => `${count} ${count === 1 ? 'producto' : 'productos'}`;

type Dialog = 'category' | 'brand' | 'delete' | null;

interface ProductBulkActionsProps {
  ids: number[];
  categoryOptions: SelectOption[];
  brandOptions: SelectOption[];
  /** Después de aplicar: limpia la selección (y, si se eliminaron, saca esos ids). */
  onDone: () => void;
}

export function ProductBulkActions({ ids, categoryOptions, brandOptions, onDone }: ProductBulkActionsProps) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const bulkUpdate = useBulkUpdateProducts();
  const bulkDelete = useBulkDeleteProducts();
  const busy = bulkUpdate.isPending || bulkDelete.isPending;
  const total = productCount(ids.length);

  // Desde los diálogos con formulario: si falla, FormDialog muestra el error y queda abierto.
  // `done`: cómo termina el mensaje para uno y para varios ("activado" / "activados").
  const update = async (
    data: { categoryId?: number; brandId?: number | null; isActive?: boolean },
    done: [one: string, many: string],
  ) => {
    const { count } = await bulkUpdate.mutateAsync({ ids, data });
    toast.success(`${productCount(count)} ${count === 1 ? done[0] : done[1]}`);
    onDone();
  };

  const setActive = (isActive: boolean) =>
    update({ isActive }, isActive ? ['activado', 'activados'] : ['desactivado', 'desactivados']).catch((error: Error) => toast.error(error.message));

  return (
    <>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog('category')}>
        <FolderTree /> Cambiar categoría
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog('brand')}>
        <Tag /> Cambiar marca
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => setActive(true)}>
        {bulkUpdate.isPending && bulkUpdate.variables?.data.isActive === true ? <Loader2 className="animate-spin" /> : <Eye />}
        Activar
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => setActive(false)}>
        {bulkUpdate.isPending && bulkUpdate.variables?.data.isActive === false ? (
          <Loader2 className="animate-spin" />
        ) : (
          <EyeOff />
        )}
        Desactivar
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={busy}
        onClick={() => setDialog('delete')}
      >
        <Trash2 /> Eliminar
      </Button>

      <FormDialog
        open={dialog === 'category'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Cambiar categoría"
        description={`Se va a aplicar a ${total}.`}
        schema={categorySchema}
        defaultValues={{}}
        submitLabel="Aplicar"
        onSubmit={({ categoryId }) => update({ categoryId }, ['cambiado de categoría', 'cambiados de categoría'])}
      >
        {(form) => (
          <SelectField
            control={form.control}
            name="categoryId"
            label="Nueva categoría"
            placeholder="Seleccioná una categoría"
            options={categoryOptions}
            required
          />
        )}
      </FormDialog>

      <FormDialog
        open={dialog === 'brand'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Cambiar marca"
        description={`Se va a aplicar a ${total}.`}
        schema={brandSchema}
        defaultValues={{}}
        submitLabel="Aplicar"
        onSubmit={({ brandId }) => update(
            { brandId },
            brandId === null ? ['quedó sin marca', 'quedaron sin marca'] : ['cambiado de marca', 'cambiados de marca'],
          )}
      >
        {(form) => (
          <SelectField
            control={form.control}
            name="brandId"
            label="Nueva marca"
            placeholder="Seleccioná una marca"
            noneLabel="Sin marca"
            options={brandOptions}
            required
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`¿Eliminar ${total}?`}
        description="No se puede deshacer. Las ventas que ya los incluyen no se modifican."
        confirmLabel={`Eliminar ${total}`}
        cancelLabel="Volver"
        destructive
        loading={bulkDelete.isPending}
        onConfirm={() =>
          bulkDelete
            .mutateAsync({ ids })
            .then(({ count }) => {
              toast.success(`${productCount(count)} ${count === 1 ? 'eliminado' : 'eliminados'}`);
              setDialog(null);
              onDone();
            })
            .catch((error: Error) => toast.error(error.message))
        }
      />
    </>
  );
}
