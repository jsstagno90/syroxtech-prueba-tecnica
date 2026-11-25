import Link from 'next/link';
import type { ProductResponse } from '@admin/shared';
import { RowActions } from '@/components/crud/row-actions';
import type { Column } from '@/components/data-table/types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import type { ProductSortKey } from './api';
import { ProductThumb } from './product-thumb';

interface ProductColumnsOptions {
  onEdit: (product: ProductResponse) => void;
  onDelete: (product: ProductResponse) => void;
}

export function getProductColumns({ onEdit, onDelete }: ProductColumnsOptions): Column<ProductResponse>[] {
  return [
    {
      id: 'name',
      header: 'Nombre',
      sortKey: 'name' satisfies ProductSortKey,
      cell: (product) => (
        <div className="flex min-w-64 items-center gap-3">
          <ProductThumb src={product.imageUrl} alt={product.name} />
          <div className="min-w-0">
            <Link href={`/productos/${product.id}`} className="block max-w-80 truncate font-medium hover:underline">
              {product.name}
            </Link>
            <p className="text-muted-foreground max-w-80 truncate text-xs">{product.description ?? product.sku ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Categoría',
      cell: (product) => product.category.name,
    },
    {
      id: 'brand',
      header: 'Marca',
      cell: (product) => product.brand?.name ?? <span className="text-muted-foreground">Sin marca</span>,
    },
    {
      id: 'variants',
      header: 'Variantes',
      cell: (product) =>
        product.variants.length ? (
          <span className="text-sm" title={product.options.map((option) => option.name).join(' · ')}>
            {product.variants.length}{' '}
            <span className="text-muted-foreground text-xs">({product.options.map((option) => option.name).join(', ')})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'price',
      header: 'Precio',
      sortKey: 'price' satisfies ProductSortKey,
      cell: (product) => <span className="font-medium tabular-nums">{formatCurrency(product.price)}</span>,
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (product) =>
        product.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      cell: (product) => <RowActions label={product.name} onEdit={() => onEdit(product)} onDelete={() => onDelete(product)} />,
      className: 'w-24',
    },
  ];
}
