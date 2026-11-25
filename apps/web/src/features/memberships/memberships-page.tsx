'use client';

import { useMemo } from 'react';
import { useWatch, type DefaultValues, type UseFormReturn } from 'react-hook-form';
import { Info, Plus } from 'lucide-react';
import {
  TIER_COLORS,
  TIER_COLOR_LABELS,
  createMembershipTierSchema,
  type CreateMembershipTierDto,
  type CreateMembershipTierInput,
  type MembershipTierResponse,
} from '@admin/shared';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { FormDialog } from '@/components/crud/form-dialog';
import { RowActions } from '@/components/crud/row-actions';
import { DataTable } from '@/components/data-table/data-table';
import type { Column } from '@/components/data-table/types';
import { NumberField, SelectField, TextField, TextareaField } from '@/components/form/fields';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useCrudState } from '@/hooks/use-crud-state';
import { useTableState } from '@/hooks/use-table-state';
import { formatCurrency, formatNumber } from '@/lib/format';
import { membershipHooks, type MembershipSortKey } from './api';
import { TierBadge } from './tier-badge';

const COLOR_OPTIONS = TIER_COLORS.map((color) => ({ value: color, label: TIER_COLOR_LABELS[color] }));

const multiplier = (value: number) => `x${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

function toFormValues(tier?: MembershipTierResponse | null): DefaultValues<CreateMembershipTierInput> {
  if (!tier) return { name: '', pointsMultiplier: 1, color: 'slate', benefits: '' };
  return {
    name: tier.name,
    minSpent: tier.minSpent,
    pointsMultiplier: tier.pointsMultiplier,
    color: tier.color,
    benefits: tier.benefits ?? '',
  };
}

/**
 * Niveles de membresía: cada cliente queda en el nivel más alto que alcanzó con lo que gastó.
 * No hay que asignarlos a mano y el nivel multiplica los puntos de lealtad.
 */
export function MembershipsPage() {
  const table = useTableState<MembershipSortKey>({ sortBy: 'minSpent' });
  const crud = useCrudState<MembershipTierResponse>();
  const list = membershipHooks.useList(table.query);
  const create = membershipHooks.useCreate();
  const update = membershipHooks.useUpdate();
  const remove = membershipHooks.useRemove();
  const { openEdit, askDelete } = crud;

  const columns = useMemo<Column<MembershipTierResponse>[]>(
    () => [
      {
        id: 'name',
        header: 'Nivel',
        sortKey: 'name',
        cell: (tier) => (
          <div className="grid gap-1">
            <TierBadge tier={tier} />
            <p className="text-muted-foreground max-w-md text-xs">{tier.benefits ?? 'Sin beneficios cargados'}</p>
          </div>
        ),
      },
      {
        id: 'minSpent',
        header: 'Desde',
        sortKey: 'minSpent',
        cell: (tier) => (
          <span className="tabular-nums">{tier.minSpent === 0 ? 'Primera compra' : `${formatCurrency(tier.minSpent)} gastados`}</span>
        ),
      },
      {
        id: 'multiplier',
        header: 'Puntos',
        cell: (tier) => <span className="font-medium tabular-nums">{multiplier(tier.pointsMultiplier)}</span>,
      },
      {
        id: 'customers',
        header: 'Clientes',
        cell: (tier) => <span className="tabular-nums">{formatNumber(tier.customersCount)}</span>,
        className: 'text-right',
        headerClassName: 'text-right',
      },
      {
        id: 'actions',
        header: <span className="sr-only">Acciones</span>,
        cell: (tier) => <RowActions label={tier.name} onEdit={() => openEdit(tier)} onDelete={() => askDelete(tier)} />,
        className: 'w-24',
      },
    ],
    [openEdit, askDelete],
  );

  const editing = crud.editing;

  return (
    <>
      <PageHeader
        title="Membresías"
        description="Niveles de clientes según lo que compraron, con sus beneficios."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus /> Nuevo nivel
          </Button>
        }
      />

      <div className="bg-muted/40 text-muted-foreground mb-6 flex gap-3 rounded-xl border p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Los clientes no se asignan a mano: cada uno entra en el nivel más alto cuyo mínimo ya alcanzó (sumando sus compras no
          canceladas). El multiplicador se aplica a los <strong className="text-foreground">puntos de lealtad</strong>.
        </p>
      </div>

      <DataTable
        title="Niveles"
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
        emptyMessage="Todavía no hay niveles. Creá el primero (por ejemplo, Bronce desde $0)."
      />

      <FormDialog<CreateMembershipTierInput, CreateMembershipTierDto>
        open={crud.formOpen}
        onOpenChange={crud.setFormOpen}
        title={editing ? `Editar ${editing.name}` : 'Nuevo nivel'}
        schema={createMembershipTierSchema}
        defaultValues={toFormValues(editing)}
        submitLabel={editing ? 'Guardar cambios' : 'Crear nivel'}
        onSubmit={(values) => (editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values))}
      >
        {(form) => <TierFields form={form} />}
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(open) => !open && crud.closeDelete()}
        title="Eliminar nivel"
        description={
          <>
            Vas a eliminar <strong>{crud.deleting?.name}</strong>.
            {!!crud.deleting?.customersCount && ` Sus ${crud.deleting.customersCount} clientes pasan al nivel de abajo.`}
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

function TierFields({ form }: { form: UseFormReturn<CreateMembershipTierInput, unknown, CreateMembershipTierDto> }) {
  const [name, color] = useWatch({ control: form.control, name: ['name', 'color'] });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField control={form.control} name="name" label="Nombre" placeholder="Ej: Oro" required autoFocus />
      <SelectField control={form.control} name="color" label="Color" options={COLOR_OPTIONS} required />
      <NumberField
        control={form.control}
        name="minSpent"
        label="Desde (gasto acumulado)"
        placeholder="Ej: 500000"
        min={0}
        step="1"
        required
        description="0 = todos desde la primera compra"
      />
      <NumberField
        control={form.control}
        name="pointsMultiplier"
        label="Multiplicador de puntos"
        placeholder="Ej: 1.5"
        min={1}
        max={10}
        step="0.05"
        required
      />
      <TextareaField
        control={form.control}
        name="benefits"
        label="Beneficios"
        placeholder="Ej: envío gratis y acceso anticipado a lanzamientos"
        rows={2}
        className="sm:col-span-2"
      />
      <div className="flex items-center gap-2 text-sm sm:col-span-2">
        <span className="text-muted-foreground">Vista previa:</span>
        <TierBadge tier={{ name: name || 'Nivel', color: color ?? 'slate' }} />
      </div>
    </div>
  );
}
