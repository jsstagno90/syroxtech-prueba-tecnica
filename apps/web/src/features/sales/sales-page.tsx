'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  SALE_STATUSES,
  SALE_STATUS_LABELS,
  type PaymentStatus,
  type SaleStatus,
} from '@admin/shared';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableState } from '@/hooks/use-table-state';
import { saleHooks, type SaleFilters, type SaleSortKey } from './api';
import { getSaleColumns } from './columns';
import { GenerateSaleDialog } from './generate-sale-dialog';
import { SaleDetailDialog } from './sale-detail-dialog';

const ALL = 'all';

export function SalesPage() {
  const table = useTableState<SaleSortKey>();
  const [filters, setFilters] = useState<SaleFilters>({});
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const list = saleHooks.useList({ ...table.query, ...filters });

  const columns = useMemo(() => getSaleColumns({ onView: (sale) => setViewingId(sale.id) }), []);

  const updateFilter = (patch: SaleFilters) => {
    setFilters((current) => ({ ...current, ...patch }));
    table.resetPage();
  };

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Ventas registradas, su estado de envío y de pago."
        actions={
          <Button onClick={() => setGenerateOpen(true)}>
            <Plus /> Generar venta
          </Button>
        }
      />

      <DataTable
        title="Listado de ventas"
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
        emptyMessage="No hay ventas con esos filtros."
        emptyAction={
          <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
            Generar la primera venta
          </Button>
        }
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              value={table.searchInput}
              onChange={table.setSearchInput}
              placeholder="Buscar por cliente, correo u orden..."
              className="sm:max-w-sm"
            />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select
                value={filters.status ?? ALL}
                onValueChange={(value) => updateFilter({ status: value === ALL ? undefined : (value as SaleStatus) })}
              >
                <SelectTrigger className="sm:w-44" aria-label="Filtrar por estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los estados</SelectItem>
                  {SALE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {SALE_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.paymentStatus ?? ALL}
                onValueChange={(value) =>
                  updateFilter({ paymentStatus: value === ALL ? undefined : (value as PaymentStatus) })
                }
              >
                <SelectTrigger className="sm:w-40" aria-label="Filtrar por pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los pagos</SelectItem>
                  {PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {PAYMENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <GenerateSaleDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <SaleDetailDialog saleId={viewingId} onOpenChange={(open) => !open && setViewingId(null)} />
    </>
  );
}
