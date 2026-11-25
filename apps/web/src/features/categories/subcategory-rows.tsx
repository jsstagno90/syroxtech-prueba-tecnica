'use client';

import { useState } from 'react';
import { CornerDownRight } from 'lucide-react';
import type { CategoryResponse } from '@admin/shared';
import { ExpandToggle } from '@/components/data-table/data-table';
import type { Column } from '@/components/data-table/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';
import { categoryHooks } from './api';

interface SubcategoryRowsProps {
  parent: CategoryResponse;
  columns: Column<CategoryResponse>[];
  /** Nivel en el árbol: define la sangría de la columna "Nombre". */
  depth?: number;
}

const INDENT_PX = 20;

/**
 * Subcategorías de una categoría, como filas debajo de ella.
 * Se cargan recién cuando se despliegan, y cada una puede abrir sus propias hijas.
 */
export function SubcategoryRows({ parent, columns, depth = 1 }: SubcategoryRowsProps) {
  const { data, isLoading } = categoryHooks.useList({
    page: 1,
    pageSize: 100,
    parentId: parent.id,
    sortBy: 'position',
    sortOrder: 'asc',
  });

  if (isLoading) {
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell />
        <TableCell colSpan={columns.length}>
          <Skeleton className="h-5 w-64" style={{ marginLeft: depth * INDENT_PX }} />
        </TableCell>
      </TableRow>
    );
  }

  return data?.data.map((child) => (
    <SubcategoryRow key={child.id} category={child} columns={columns} depth={depth} />
  ));
}

function SubcategoryRow({ category, columns, depth }: { category: CategoryResponse; columns: Column<CategoryResponse>[]; depth: number }) {
  const [open, setOpen] = useState(false);
  const canExpand = category.subcategoriesCount > 0;

  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell />
        {columns.map((column) => (
          <TableCell key={column.id} className={column.className}>
            {column.id === 'name' ? (
              <div className="flex items-center gap-1.5" style={{ paddingLeft: (depth - 1) * INDENT_PX }}>
                {canExpand ? (
                  <ExpandToggle
                    open={open}
                    onToggle={() => setOpen((value) => !value)}
                    label={`Mostrar subcategorías de ${category.name}`}
                  />
                ) : (
                  <CornerDownRight className="text-muted-foreground mx-1.5 size-4 shrink-0" aria-hidden />
                )}
                {column.cell(category)}
              </div>
            ) : (
              column.cell(category)
            )}
          </TableCell>
        ))}
      </TableRow>
      {open && <SubcategoryRows parent={category} columns={columns} depth={depth + 1} />}
    </>
  );
}
