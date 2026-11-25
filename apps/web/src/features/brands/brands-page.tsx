'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { createBrandSchema, type BrandResponse } from '@admin/shared';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { FormDialog } from '@/components/crud/form-dialog';
import { RowActions } from '@/components/crud/row-actions';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import type { Column } from '@/components/data-table/types';
import { TextField } from '@/components/form/fields';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useCrudState } from '@/hooks/use-crud-state';
import { useTableState } from '@/hooks/use-table-state';
import { formatDate } from '@/lib/format';
import { brandHooks, type BrandSortKey } from './api';

/**
 * Marcas no estaba en el pedido original: con los componentes genéricos
 * (DataTable, FormDialog, ConfirmDialog, hooks de recurso) un CRUD completo entra en un archivo.
 */
export function BrandsPage() {
  const table = useTableState<BrandSortKey>({ sortBy: 'name' });
  const crud = useCrudState<BrandResponse>();
  const list = brandHooks.useList(table.query);
  const create = brandHooks.useCreate();
  const update = brandHooks.useUpdate();
  const remove = brandHooks.useRemove();
  const { openEdit, askDelete } = crud;

  const columns = useMemo<Column<BrandResponse>[]>(
    () => [
      { id: 'name', header: 'Nombre', sortKey: 'name', cell: (brand) => <span className="font-medium">{brand.name}</span> },
      {
        id: 'products',
        header: 'Productos',
        cell: (brand) => <span className="tabular-nums">{brand.productsCount}</span>,
      },
      {
        id: 'createdAt',
        header: 'Creada',
        sortKey: 'createdAt',
        cell: (brand) => <span className="text-muted-foreground">{formatDate(brand.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: <span className="sr-only">Acciones</span>,
        cell: (brand) => <RowActions label={brand.name} onEdit={() => openEdit(brand)} onDelete={() => askDelete(brand)} />,
        className: 'w-24',
      },
    ],
    [openEdit, askDelete],
  );

  const editing = crud.editing;

  return (
    <>
      <PageHeader
        title="Marcas"
        description="Marcas disponibles para asignar a los productos."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus /> Nueva marca
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={list.data?.data}
        meta={list.data?.meta}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        onRetry={list.refetch}
        sort={table.sort}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        emptyMessage="No hay marcas para mostrar."
        toolbar={<SearchInput value={table.searchInput} onChange={table.setSearchInput} placeholder="Buscar marca..." />}
      />

      <FormDialog
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={editing ? 'Editar marca' : 'Nueva marca'}
        schema={createBrandSchema}
        defaultValues={{ name: editing?.name ?? '' }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear'}
        onSubmit={(values) => (editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values))}
      >
        {(form) => <TextField control={form.control} name="name" label="Nombre" placeholder="Ej: Adidas" required autoFocus />}
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(open) => !open && crud.closeDelete()}
        title="Eliminar marca"
        description={
          <>
            Vas a eliminar <strong>{crud.deleting?.name}</strong>.
            {!!crud.deleting?.productsCount && ` Sus ${crud.deleting.productsCount} productos van a quedar sin marca.`}
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(crud.deleting!.id).then(crud.closeDelete, () => undefined)}
      />
    </>
  );
}
