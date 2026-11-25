'use client';

import { useMemo, useState } from 'react';
import { useWatch, type DefaultValues, type UseFormReturn } from 'react-hook-form';
import { Plus } from 'lucide-react';
import {
  DISCOUNT_STATUSES,
  DISCOUNT_STATUS_LABELS,
  DISCOUNT_TYPES,
  DISCOUNT_TYPE_LABELS,
  createDiscountSchema,
  formatDiscountValue,
  type CreateDiscountDto,
  type CreateDiscountInput,
  type DiscountResponse,
  type DiscountStatus,
} from '@admin/shared';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { FormDialog } from '@/components/crud/form-dialog';
import { RowActions } from '@/components/crud/row-actions';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import type { Column } from '@/components/data-table/types';
import { NumberField, SelectField, SwitchField, TextField } from '@/components/form/fields';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCrudState } from '@/hooks/use-crud-state';
import { useTableState } from '@/hooks/use-table-state';
import { formatCurrency, formatDate } from '@/lib/format';
import { discountHooks, type DiscountSortKey } from './api';

const ALL = 'all';

const STATUS_VARIANT: Record<DiscountStatus, BadgeVariant> = {
  ACTIVE: 'success',
  SCHEDULED: 'info',
  EXPIRED: 'neutral',
  EXHAUSTED: 'warning',
  INACTIVE: 'neutral',
};

const TYPE_OPTIONS = DISCOUNT_TYPES.map((type) => ({ value: type, label: DISCOUNT_TYPE_LABELS[type] }));

/** "2026-11-28" → "28 nov 2026" (la fecha ya es un día de la tienda, sin hora). */
const formatDay = (day: string) => formatDate(`${day}T12:00:00-03:00`);

function validity(discount: DiscountResponse) {
  if (!discount.startsAt && !discount.endsAt) return 'Sin vencimiento';
  if (discount.startsAt && discount.endsAt) return `${formatDay(discount.startsAt)} → ${formatDay(discount.endsAt)}`;
  return discount.endsAt ? `Hasta el ${formatDay(discount.endsAt)}` : `Desde el ${formatDay(discount.startsAt!)}`;
}

function toFormValues(discount?: DiscountResponse | null): DefaultValues<CreateDiscountInput> {
  if (!discount) return { code: '', description: '', type: 'PERCENTAGE', startsAt: '', endsAt: '', isActive: true };
  return {
    code: discount.code,
    description: discount.description ?? '',
    type: discount.type,
    value: discount.value,
    minPurchase: discount.minPurchase,
    usageLimit: discount.usageLimit,
    startsAt: discount.startsAt ?? '',
    endsAt: discount.endsAt ?? '',
    isActive: discount.isActive,
  };
}

/** Cupones de descuento: se aplican al generar una venta y la API valida que estén vigentes. */
export function DiscountsPage() {
  const table = useTableState<DiscountSortKey>();
  const crud = useCrudState<DiscountResponse>();
  const [status, setStatus] = useState<DiscountStatus | undefined>();
  const list = discountHooks.useList({ ...table.query, status });
  const create = discountHooks.useCreate();
  const update = discountHooks.useUpdate();
  const remove = discountHooks.useRemove();
  const { openEdit, askDelete } = crud;

  const columns = useMemo<Column<DiscountResponse>[]>(
    () => [
      {
        id: 'code',
        header: 'Código',
        sortKey: 'code',
        cell: (discount) => (
          <div>
            <p className="font-mono font-semibold">{discount.code}</p>
            <p className="text-muted-foreground text-xs">{discount.description ?? '—'}</p>
          </div>
        ),
      },
      {
        id: 'value',
        header: 'Descuento',
        cell: (discount) => (
          <div>
            <p className="font-medium tabular-nums">{formatDiscountValue(discount, formatCurrency)}</p>
            <p className="text-muted-foreground text-xs">{DISCOUNT_TYPE_LABELS[discount.type]}</p>
          </div>
        ),
      },
      {
        id: 'conditions',
        header: 'Condiciones',
        cell: (discount) => (
          <span className="text-sm">
            {discount.minPurchase ? `Compra mínima ${formatCurrency(discount.minPurchase)}` : 'Sin mínimo'}
          </span>
        ),
      },
      {
        id: 'usage',
        header: 'Usos',
        cell: (discount) => (
          <span className="tabular-nums">
            {discount.usedCount}
            {discount.usageLimit !== null && <span className="text-muted-foreground"> / {discount.usageLimit}</span>}
          </span>
        ),
      },
      { id: 'endsAt', header: 'Vigencia', sortKey: 'endsAt', cell: (discount) => <span className="text-sm">{validity(discount)}</span> },
      {
        id: 'status',
        header: 'Estado',
        cell: (discount) => <Badge variant={STATUS_VARIANT[discount.status]}>{DISCOUNT_STATUS_LABELS[discount.status]}</Badge>,
      },
      {
        id: 'actions',
        header: <span className="sr-only">Acciones</span>,
        cell: (discount) => (
          <RowActions label={discount.code} onEdit={() => openEdit(discount)} onDelete={() => askDelete(discount)} />
        ),
        className: 'w-24',
      },
    ],
    [openEdit, askDelete],
  );

  const editing = crud.editing;

  return (
    <>
      <PageHeader
        title="Descuentos"
        description="Cupones que se aplican al generar una venta. La API revisa vigencia, compra mínima y límite de usos."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus /> Nuevo cupón
          </Button>
        }
      />

      <DataTable
        title="Cupones"
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
        emptyMessage="No hay cupones para mostrar."
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={table.searchInput} onChange={table.setSearchInput} placeholder="Buscar código..." className="sm:max-w-sm" />
            <Select
              value={status ?? ALL}
              onValueChange={(value) => {
                setStatus(value === ALL ? undefined : (value as DiscountStatus));
                table.resetPage();
              }}
            >
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {DISCOUNT_STATUSES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {DISCOUNT_STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <FormDialog<CreateDiscountInput, CreateDiscountDto>
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={editing ? `Editar ${editing.code}` : 'Nuevo cupón'}
        description="El código es lo que se ingresa al generar la venta."
        schema={createDiscountSchema}
        defaultValues={toFormValues(editing)}
        submitLabel={editing ? 'Guardar cambios' : 'Crear cupón'}
        onSubmit={(values) => (editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values))}
        className="sm:max-w-xl"
      >
        {(form) => <DiscountFields form={form} />}
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(open) => !open && crud.closeDelete()}
        title="Eliminar cupón"
        description={
          <>
            Vas a eliminar <strong>{crud.deleting?.code}</strong>. Las ventas que ya lo usaron conservan el descuento.
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

function DiscountFields({ form }: { form: UseFormReturn<CreateDiscountInput, unknown, CreateDiscountDto> }) {
  const type = useWatch({ control: form.control, name: 'type' });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        control={form.control}
        name="code"
        label="Código"
        placeholder="Ej: VERANO20"
        required
        autoFocus
        className="sm:col-span-2"
        onInput={(event) => {
          event.currentTarget.value = event.currentTarget.value.toUpperCase();
        }}
      />
      <TextField control={form.control} name="description" label="Descripción" placeholder="Para qué es (opcional)" className="sm:col-span-2" />
      <SelectField control={form.control} name="type" label="Tipo" options={TYPE_OPTIONS} required />
      <NumberField
        control={form.control}
        name="value"
        label={type === 'FIXED' ? 'Monto a descontar' : 'Porcentaje'}
        placeholder={type === 'FIXED' ? 'Ej: 5000' : 'Ej: 10'}
        min={0}
        max={type === 'FIXED' ? undefined : 100}
        step="0.01"
        required
      />
      <NumberField control={form.control} name="minPurchase" label="Compra mínima" placeholder="Sin mínimo" min={0} step="0.01" />
      <NumberField control={form.control} name="usageLimit" label="Límite de usos" placeholder="Sin límite" min={1} step="1" />
      <TextField control={form.control} name="startsAt" label="Desde" type="date" description="Vacío: desde hoy" />
      <TextField control={form.control} name="endsAt" label="Hasta" type="date" description="Vacío: sin vencimiento" />
      <SwitchField control={form.control} name="isActive" label="Cupón activo" description="Pausalo sin borrarlo." className="sm:col-span-2" />
    </div>
  );
}
