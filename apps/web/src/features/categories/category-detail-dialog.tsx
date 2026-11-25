'use client';

import Link from 'next/link';
import { FolderTree, Package } from 'lucide-react';
import type { CategoryResponse } from '@admin/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { productHooks } from '@/features/products/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { categoryHooks } from './api';

interface CategoryDetailDialogProps {
  category: CategoryResponse | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (category: CategoryResponse) => void;
}

/** "Ver" de una categoría: dónde está en el árbol, sus subcategorías y sus productos. */
export function CategoryDetailDialog({ category, onOpenChange, onEdit }: CategoryDetailDialogProps) {
  const id = category?.id;
  const children = categoryHooks.useList({ page: 1, pageSize: 50, parentId: id, sortBy: 'position', sortOrder: 'asc' });
  const products = productHooks.useList({ page: 1, pageSize: 6, categoryId: id, sortBy: 'name', sortOrder: 'asc' });

  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {category && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {category.name}
                {category.parent ? <Badge variant="info">{category.parent.name}</Badge> : <Badge variant="success">Principal</Badge>}
              </DialogTitle>
              <DialogDescription>
                Posición {category.position} · creada el {formatDate(category.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <section className="grid gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FolderTree className="size-4" /> Subcategorías ({category.subcategoriesCount})
              </h3>
              {category.subcategoriesCount === 0 ? (
                <p className="text-muted-foreground text-sm">No tiene subcategorías.</p>
              ) : children.isLoading ? (
                <Skeleton className="h-10" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {children.data?.data.map((child) => (
                    <Badge key={child.id} variant="outline" className="font-normal">
                      {child.name}
                      <span className="text-muted-foreground">· {child.productsCount}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="size-4" /> Productos ({category.productsCount})
              </h3>
              {category.productsCount === 0 ? (
                <p className="text-muted-foreground text-sm">No tiene productos asignados directamente.</p>
              ) : products.isLoading ? (
                <Skeleton className="h-24" />
              ) : (
                <ul className="divide-y rounded-lg border text-sm">
                  {products.data?.data.map((product) => (
                    <li key={product.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <Link href={`/productos/${product.id}`} className="min-w-0 truncate hover:underline">
                        {product.name}
                      </Link>
                      <span className="text-muted-foreground shrink-0 tabular-nums">{formatCurrency(product.price)}</span>
                    </li>
                  ))}
                  {category.productsCount > 6 && (
                    <li className="text-muted-foreground px-3 py-2 text-center text-xs">
                      y {category.productsCount - 6} más
                    </li>
                  )}
                </ul>
              )}
            </section>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(category);
                }}
              >
                Editar categoría
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
