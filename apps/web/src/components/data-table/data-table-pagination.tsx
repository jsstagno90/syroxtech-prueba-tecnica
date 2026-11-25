'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { PaginationMeta } from '@admin/shared';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZES = [10, 20, 50];

interface DataTablePaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function DataTablePagination({ meta, onPageChange, onPageSizeChange }: DataTablePaginationProps) {
  const { page, pageSize, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
      <p className="text-muted-foreground text-sm">
        Mostrando <span className="text-foreground font-medium">{from}–{to}</span> de{' '}
        <span className="text-foreground font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="hidden items-center gap-2 text-sm sm:flex">
            <span className="text-muted-foreground">Filas</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-[70px]" aria-label="Filas por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="text-sm">
          Página {page} de {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="Primera página">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} aria-label="Última página">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
