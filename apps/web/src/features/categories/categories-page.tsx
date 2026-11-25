'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { CategoryResponse } from '@admin/shared';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useCrudState } from '@/hooks/use-crud-state';
import { useTableState } from '@/hooks/use-table-state';
import { categoryHooks, type CategorySortKey } from './api';
import { CategoryFormDialog } from './category-form-dialog';
import { getCategoryColumns } from './columns';
import { SubcategoryRows } from './subcategory-rows';

export function CategoriesPage() {
  const table = useTableState<CategorySortKey>();
  const crud = useCrudState<CategoryResponse>();
  // Sin búsqueda se ve el árbol (principales con sus hijas desplegables); buscando, la lista plana.
  const isSearching = !!table.query.search;
  const list = categoryHooks.useList({ ...table.query, rootOnly: !isSearching });
  const remove = categoryHooks.useRemove();

  const { openEdit, askDelete } = crud;
  const columns = useMemo(() => getCategoryColumns({ onEdit: openEdit, onDelete: askDelete }), [openEdit, askDelete]);

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organizá el catálogo en categorías y subcategorías."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus /> Nueva categoría
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
        emptyMessage={table.query.search ? 'Ninguna categoría coincide con la búsqueda.' : 'Todavía no hay categorías.'}
        toolbar={<SearchInput value={table.searchInput} onChange={table.setSearchInput} placeholder="Buscar por nombre..." />}
        expandable={
          isSearching
            ? undefined
            : {
                canExpand: (category) => category.subcategoriesCount > 0,
                renderRows: (category) => <SubcategoryRows parent={category} columns={columns} />,
                label: (category) => `Mostrar subcategorías de ${category.name}`,
              }
        }
      />

      <CategoryFormDialog open={crud.formOpen} onOpenChange={crud.setFormOpen} category={crud.editing} />

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(open) => !open && crud.closeDelete()}
        title="Eliminar categoría"
        description={
          <>
            Vas a eliminar <strong>{crud.deleting?.name}</strong>. Esta acción no se puede deshacer.
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
