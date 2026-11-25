'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileUp, FilterX, Plus } from 'lucide-react';
import type { ProductResponse } from '@admin/shared';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { ExportButton } from '@/components/crud/export-button';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCrudState } from '@/hooks/use-crud-state';
import { useRowSelection } from '@/hooks/use-row-selection';
import { useTableState } from '@/hooks/use-table-state';
import { brandHooks } from '@/features/brands/api';
import { buildCategoryPaths, categoryHooks } from '@/features/categories/api';
import { productHooks, type ProductFilters, type ProductSortKey } from './api';
import { ProductBulkActions } from './bulk-actions';
import { getProductColumns } from './columns';
import { exportProducts } from './export-products';
import { ImportProductsDialog } from './import/import-products-dialog';

const ALL = 'all';
const NO_BRAND = 'none';

export function ProductsPage() {
  const router = useRouter();
  const table = useTableState<ProductSortKey>();
  const crud = useCrudState<ProductResponse>();
  const [filters, setFilters] = useState<ProductFilters>({});
  const [importOpen, setImportOpen] = useState(false);
  const selection = useRowSelection();
  const list = productHooks.useList({ ...table.query, ...filters });
  const remove = productHooks.useRemove();
  const { data: categories = [] } = categoryHooks.useOptions();
  const { data: brands = [] } = brandHooks.useOptions();

  const { askDelete } = crud;
  const columns = useMemo(
    () => getProductColumns({ onEdit: (product) => router.push(`/productos/${product.id}`), onDelete: askDelete }),
    [router, askDelete],
  );
  const categoryOptions = useMemo(() => buildCategoryPaths(categories), [categories]);
  const categorySelectOptions = useMemo(
    () => categoryOptions.map((category) => ({ value: category.id, label: category.path })),
    [categoryOptions],
  );
  const brandSelectOptions = useMemo(() => brands.map((brand) => ({ value: brand.id, label: brand.name })), [brands]);

  // Al cambiar filtros o búsqueda se suelta la selección, para no editar productos que ya no se ven.
  const updateFilter = (patch: ProductFilters) => {
    setFilters((current) => ({ ...current, ...patch }));
    table.resetPage();
    selection.clear();
  };
  const updateSearch = (value: string) => {
    table.setSearchInput(value);
    selection.clear();
  };
  const hasFilters = Object.values(filters).some((value) => value !== undefined) || !!table.searchInput;

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo de la tienda: precios, categorías y estado de publicación."
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp /> Importar productos
            </Button>
            <ExportButton
              entityLabel="productos"
              onExport={() => exportProducts({ ...table.query, ...filters }, categories)}
            />
            <Button asChild>
              <Link href="/productos/nuevo">
                <Plus /> Nuevo producto
              </Link>
            </Button>
          </>
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
        selection={{
          selected: selection.selected,
          setSelected: selection.setSelected,
          label: (product) => `Seleccionar ${product.name}`,
          noun: { singular: 'producto', plural: 'productos' },
          actions: (
            <ProductBulkActions
              ids={selection.keys.map(Number)}
              categoryOptions={categorySelectOptions}
              brandOptions={brandSelectOptions}
              onDone={selection.clear}
            />
          ),
        }}
        emptyMessage={hasFilters ? 'Ningún producto coincide con los filtros.' : 'Todavía no hay productos.'}
        toolbar={
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <SearchInput
              value={table.searchInput}
              onChange={updateSearch}
              placeholder="Buscar por nombre o SKU..."
              className="lg:max-w-sm"
            />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select
                value={filters.categoryId ? String(filters.categoryId) : ALL}
                onValueChange={(value) => updateFilter({ categoryId: value === ALL ? undefined : Number(value) })}
              >
                <SelectTrigger className="sm:w-52" aria-label="Filtrar por categoría">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las categorías</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.brandId ? String(filters.brandId) : ALL}
                onValueChange={(value) =>
                  updateFilter({ brandId: value === ALL ? undefined : value === NO_BRAND ? 'none' : Number(value) })
                }
              >
                <SelectTrigger className="sm:w-40" aria-label="Filtrar por marca">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las marcas</SelectItem>
                  <SelectItem value={NO_BRAND}>Sin marca</SelectItem>
                  <SelectSeparator />
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.isActive === undefined ? ALL : String(filters.isActive)}
                onValueChange={(value) => updateFilter({ isActive: value === ALL ? undefined : value === 'true' })}
              >
                <SelectTrigger className="sm:w-36" aria-label="Filtrar por estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilters({});
                    updateSearch('');
                  }}
                >
                  <FilterX /> Limpiar
                </Button>
              )}
            </div>
          </div>
        }
      />

      <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(open) => !open && crud.closeDelete()}
        title="Eliminar producto"
        description={
          <>
            Vas a eliminar <strong>{crud.deleting?.name}</strong>. Las ventas que ya lo incluyen no se modifican.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          const id = crud.deleting!.id;
          return remove.mutateAsync(id).then(() => {
            selection.remove([id]);
            crud.closeDelete();
          }, () => undefined);
        }}
      />
    </>
  );
}
