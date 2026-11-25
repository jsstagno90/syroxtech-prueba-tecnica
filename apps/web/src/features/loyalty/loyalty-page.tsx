'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Award, Coins, Loader2, Users } from 'lucide-react';
import { loyaltySettingsSchema, type CustomerResponse, type StoreSettingsResponse } from '@admin/shared';
import { DataTable } from '@/components/data-table/data-table';
import type { Column } from '@/components/data-table/types';
import { StatCard } from '@/components/data-display/stat-card';
import { NumberField, SwitchField } from '@/components/form/fields';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { applyServerErrors, useZodForm } from '@/hooks/use-zod-form';
import { useTableState } from '@/hooks/use-table-state';
import { customerHooks, type CustomerSortKey } from '@/features/customers/api';
import { TierBadge } from '@/features/memberships/tier-badge';
import { useLoyaltySummary, useStoreSettings, useUpdateLoyaltySettings } from '@/features/settings/api';
import { formatCurrency, formatNumber, initials } from '@/lib/format';

/**
 * Programa de puntos: los clientes suman puntos por lo que compran (sin canceladas)
 * y su nivel de membresía los multiplica. Se calculan al vuelo: cambiar la regla actualiza a todos.
 */
export function LoyaltyPage() {
  const summary = useLoyaltySummary();
  const settings = useStoreSettings();
  const table = useTableState<CustomerSortKey>({ sortBy: 'points', sortOrder: 'desc' });
  const ranking = customerHooks.useList(table.query);

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
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="text-muted-foreground text-xs">{customer.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'tier',
        header: 'Membresía',
        cell: (customer) => (
          <div className="flex items-center gap-2">
            <TierBadge tier={customer.tier} />
            {customer.tier && customer.tier.pointsMultiplier !== 1 && (
              <span className="text-muted-foreground text-xs">x{customer.tier.pointsMultiplier.toLocaleString('es-AR')}</span>
            )}
          </div>
        ),
      },
      {
        id: 'totalSpent',
        header: 'Gastado',
        sortKey: 'totalSpent',
        cell: (customer) => <span className="tabular-nums">{formatCurrency(customer.totalSpent)}</span>,
        className: 'text-right',
        headerClassName: 'text-right',
      },
      {
        id: 'points',
        header: 'Puntos',
        sortKey: 'points',
        cell: (customer) => <span className="font-semibold tabular-nums">{formatNumber(customer.points)}</span>,
        className: 'text-right',
        headerClassName: 'text-right',
      },
    ],
    [],
  );

  const amountPerPoint = summary.data?.settings.amountPerPoint;

  return (
    <>
      <PageHeader title="Puntos de lealtad" description="Los clientes suman puntos con cada compra; su membresía los multiplica." />

      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Coins}
            label="Puntos acumulados"
            value={summary.data ? formatNumber(summary.data.totalPoints) : '—'}
            hint="Entre todos los clientes"
          />
          <StatCard
            icon={Users}
            label="Clientes con puntos"
            value={summary.data ? formatNumber(summary.data.customersWithPoints) : '—'}
            hint="Tienen al menos 1 punto"
          />
          <StatCard
            icon={Award}
            label="Regla"
            value={amountPerPoint ? `1 punto c/ ${formatCurrency(amountPerPoint)}` : '—'}
            hint={summary.data?.settings.loyaltyEnabled === false ? 'Programa pausado' : 'Multiplicado por la membresía'}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DataTable
              title="Ranking de clientes"
              columns={columns}
              data={ranking.data?.data}
              meta={ranking.data?.meta}
              getRowKey={(customer) => customer.email}
              isLoading={ranking.isLoading}
              isFetching={ranking.isFetching}
              isError={ranking.isError}
              onRetry={ranking.refetch}
              sort={table.sort}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
              emptyMessage="Todavía no hay clientes con compras."
            />
          </div>
          {settings.data ? <LoyaltyForm key={settings.data.updatedAt} settings={settings.data} /> : <Skeleton className="h-72 rounded-xl" />}
        </div>
      </div>
    </>
  );
}

function LoyaltyForm({ settings }: { settings: StoreSettingsResponse }) {
  const update = useUpdateLoyaltySettings();
  const form = useZodForm(loyaltySettingsSchema, {
    loyaltyEnabled: settings.loyaltyEnabled,
    amountPerPoint: settings.amountPerPoint,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="content-start">
      <Card>
        <CardHeader>
          <CardTitle>Regla de puntos</CardTitle>
          <CardDescription>Cambiarla recalcula los puntos de todos los clientes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SwitchField control={form.control} name="loyaltyEnabled" label="Programa activo" description="Si lo pausás, nadie suma puntos." />
          <NumberField
            control={form.control}
            name="amountPerPoint"
            label="Pesos por punto"
            description="Ej: 1000 = 1 punto cada $1.000 gastados"
            min={1}
            step="1"
            required
          />
          <p className="text-muted-foreground text-xs">
            Los multiplicadores de cada nivel se configuran en{' '}
            <Link href="/membresias" className="text-foreground underline">
              Membresías
            </Link>
            .
          </p>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Guardar regla
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
