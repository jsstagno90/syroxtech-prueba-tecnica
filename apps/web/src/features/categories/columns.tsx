import type { CategoryResponse } from '@admin/shared';
import { RowActions } from '@/components/crud/row-actions';
import type { Column } from '@/components/data-table/types';
import { Badge } from '@/components/ui/badge';
import type { CategorySortKey } from './api';

interface CategoryColumnsOptions {
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
}

export function getCategoryColumns({ onEdit, onDelete }: CategoryColumnsOptions): Column<CategoryResponse>[] {
  return [
    {
      id: 'position',
      header: 'Posición',
      sortKey: 'position' satisfies CategorySortKey,
      cell: (category) => <span className="text-muted-foreground tabular-nums">{category.position}</span>,
      className: 'w-24',
    },
    {
      id: 'name',
      header: 'Nombre',
      sortKey: 'name' satisfies CategorySortKey,
      cell: (category) => <span className="font-medium">{category.name}</span>,
    },
    {
      id: 'subcategories',
      header: 'Subcategorías',
      cell: (category) => (
        <span className="text-muted-foreground">
          {category.subcategoriesCount} {category.subcategoriesCount === 1 ? 'subcategoría' : 'subcategorías'}
        </span>
      ),
    },
    {
      id: 'parent',
      header: 'Categoría padre',
      cell: (category) =>
        category.parent ? <Badge variant="info">{category.parent.name}</Badge> : <Badge variant="success">Principal</Badge>,
    },
    {
      id: 'products',
      header: 'Productos',
      cell: (category) => <span className="tabular-nums">{category.productsCount}</span>,
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      cell: (category) => (
        <RowActions label={category.name} onEdit={() => onEdit(category)} onDelete={() => onDelete(category)} />
      ),
      className: 'w-24',
    },
  ];
}
