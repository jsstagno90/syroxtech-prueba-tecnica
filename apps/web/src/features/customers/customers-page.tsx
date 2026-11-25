'use client';

import { useMemo, useState } from 'react';
import { Eye, FilterX } from 'lucide-react';
import type { CustomerResponse } from '@admin/shared';
import { ExportButton } from '@/components/crud/export-button';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import type { Column } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableState } from '@/hooks/use-table-state';
import { membershipHooks } from '@/features/memberships/api';
import { TierBadge } from '@/features/memberships/tier-badge';
import { SaleDetailDialog } from '@/features/sales/sale-detail-dialog';
import { datedFileName, exportToExcel, fetchAllPages } from '@/lib/export-excel';
import { formatCurrency, formatDate, formatNumber, initials } from '@/lib/format';
import { customerHooks, customersApi, type CustomerFilters, type CustomerSortKey } from './api';
import { CustomerDetailDialog } from './customer-detail-dialog';

const ALL = 'all';

/**
 * Clientes: no se cargan a mano, salen de las ventas (agrupadas por correo).
 * Muestra cuánto compró cada uno, su nivel de membresía y sus puntos.
 */
export function CustomersPage() {
  const table = useTableState<CustomerSortKey>();
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [viewing, setViewing] = useState<CustomerResponse | null>(null);
  const [viewingSaleId, setViewingSaleId] = useState<number | null>(null);
  const list = customerHooks.useList({ ...table.query, ...filters });
  const tiers = membershipHooks.useList({ page: 1, pageSize: 50, sortBy: 'minSpent', sortOrder: 'asc' });

  const columns = useMemo<Column<CustomerResponse>[]>(
    () => [
      {
        id: 'name',
        header: 'Cliente',
        sortKey: 'name',
        cell: (customer) => (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials(customer.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <button type="button" className="font-medium hover:underline" onClick={() => setViewing(customer)}>
                {customer.name}
              </button>
              <p className="text-muted-foreground text-xs">{customer.email}</p>
            </div>
          </div>
        ),
      },
      { id: 'phone', header: 'Teléfono', cell: (customer) => customer.phone ?? <span className="text-muted-foreground">—</span> },
      {
        id: 'ordersCount',
        header: 'Pedidos',
        sortKey: 'ordersCount',
        cell: (customer) => <span className="tabular-nums">{customer.ordersCount}</span>,
        className: 'text-right',
        headerClassName: 'text-right',
      },
      {
        id: 'totalSpent',
        header: 'Total gastado',
        sortKey: 'totalSpent',
        cell: (customer) => <span className="font-medium tabular-nums">{formatCurrency(customer.totalSpent)}</span>,
        className: 'text-right',
        headerClassName: 'text-right',
      },
      { id: 'tier', header: 'Membresía', cell: (customer) => <TierBadge tier={customer.tier} /> },
      {
        id: 'points',
        header: 'Puntos',
        sortKey: 'points',
        cell: (customer) => <span className="tabular-nums">{formatNumber(customer.points)}</span>,
        className: 'text-right',
        headerClassName: 'text-right',
      },
      {
        id: 'lastOrderAt',
        header: 'Última compra',
        sortKey: 'lastOrderAt',
        cell: (customer) => <span className="text-muted-foreground">{formatDate(customer.lastOrderAt)}</span>,
      },
      {
        id: 'actions',
        header: <span className="sr-only">Acciones</span>,
        cell: (customer) => (
          <Button variant="ghost" size="icon-sm" onClick={() => setViewing(customer)} aria-label={`Ver a ${customer.name}`}>
            <Eye />
          </Button>
        ),
        className: 'w-12',
      },
    ],
    [],
  );

  const hasFilters = filters.tierId !== undefined || !!table.searchInput;

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Se arman solos a partir de las ventas: compras, gasto, nivel de membresía y puntos."
        actions={
          <ExportButton
            entityLabel="clientes"
            onExport={async () => {
              const customers = await fetchAllPages(customersApi.list, { ...table.query, ...filters });
              await exportToExcel(
                customers,
                [
                  { header: 'Nombre', value: (c) => c.name, width: 26 },
                  { header: 'Correo', value: (c) => c.email, width: 30 },
                  { header: 'Teléfono', value: (c) => c.phone, width: 16 },
                  { header: 'Pedidos', value: (c) => c.ordersCount, width: 10 },
                  { header: 'Total gastado', value: (c) => c.totalSpent, format: '#,##0.00', width: 16 },
                  { header: 'Membresía', value: (c) => c.tier?.name, width: 14 },
                  { header: 'Puntos', value: (c) => c.points, width: 10 },
                  { header: 'Primera compra', value: (c) => new Date(c.firstOrderAt), format: 'dd/mm/yyyy', width: 16 },
                  { header: 'Última compra', value: (c) => new Date(c.lastOrderAt), format: 'dd/mm/yyyy', width: 16 },
                ],
                { fileName: datedFileName('clientes'), sheet: 'Clientes' },
              );
              return customers.length;
            }}
          />
        }
      />

      <DataTable
        title="Listado de clientes"
        columns={columns}
        data={list.data?.data}
        meta={list.data?.meta}
        getRowKey={(customer) => customer.email}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        onRetry={list.refetch}
        sort={table.sort}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        emptyMessage={hasFilters ? 'Ningún cliente coincide con los filtros.' : 'Todavía no hay clientes: aparecen con la primera venta.'}
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              value={table.searchInput}
              onChange={table.setSearchInput}
              placeholder="Buscar por nombre o correo..."
              className="sm:max-w-sm"
            />
            <Select
              value={filters.tierId ? String(filters.tierId) : ALL}
              onValueChange={(value) => {
                setFilters({ tierId: value === ALL ? undefined : Number(value) });
                table.resetPage();
              }}
            >
              <SelectTrigger className="sm:w-48" aria-label="Filtrar por membresía">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las membresías</SelectItem>
                {tiers.data?.data.map((tier) => (
                  <SelectItem key={tier.id} value={String(tier.id)}>
                    {tier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({});
                  table.setSearchInput('');
                }}
              >
                <FilterX /> Limpiar
              </Button>
            )}
          </div>
        }
      />

      <CustomerDetailDialog
        customer={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        onViewSale={setViewingSaleId}
      />
      <SaleDetailDialog saleId={viewingSaleId} onOpenChange={(open) => !open && setViewingSaleId(null)} />
    </>
  );
}
