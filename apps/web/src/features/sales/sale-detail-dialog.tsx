'use client';

import { useState, type ReactNode } from 'react';
import { CircleCheck, CreditCard, History, Loader2, MapPin, Package, Truck, User } from 'lucide-react';
import {
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_TRANSITIONS,
  type SaleDetailResponse,
  type SaleStatus,
} from '@admin/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useSaleDetail, useUpdateSaleStatus } from './api';
import { PaymentStatusBadge, SaleStatusBadge } from './status-badges';

const ACTION_LABELS: Record<SaleStatus, string> = {
  PENDING: 'Volver a pendiente',
  PREPARING: 'Pasar a preparación',
  SHIPPED: 'Marcar como enviado',
  COMPLETED: 'Completar pedido',
  CANCELLED: 'Cancelar venta',
};

interface SaleDetailDialogProps {
  saleId: number | null;
  onOpenChange: (open: boolean) => void;
}

/** "Gestionar orden": detalle completo de la venta y cambio de estado con historial. */
export function SaleDetailDialog({ saleId, onOpenChange }: SaleDetailDialogProps) {
  const { data: sale, isLoading } = useSaleDetail(saleId ?? undefined);

  return (
    <Dialog open={saleId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gestionar orden {sale && <span className="font-mono">#{sale.orderNumber}</span>}</DialogTitle>
          <DialogDescription>{sale ? `Creada el ${formatDateTime(sale.createdAt)}` : 'Cargando venta...'}</DialogDescription>
        </DialogHeader>

        {isLoading || !sale ? <DetailSkeleton /> : <SaleDetail sale={sale} />}
      </DialogContent>
    </Dialog>
  );
}

function SaleDetail({ sale }: { sale: SaleDetailResponse }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <span className="text-muted-foreground text-sm">Estado actual</span>
        <SaleStatusBadge status={sale.status} />
        <PaymentStatusBadge status={sale.paymentStatus} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={<User />} title="Cliente">
          <InfoRow label="Nombre" value={sale.customerName} />
          <InfoRow label="Correo" value={sale.customerEmail} />
          <InfoRow label="Teléfono" value={sale.customerPhone ?? '—'} />
        </Section>
        <Section icon={<CreditCard />} title="Pago">
          <InfoRow label="Método" value={PAYMENT_METHOD_LABELS[sale.paymentMethod]} />
          <InfoRow label="Estado" value={<PaymentStatusBadge status={sale.paymentStatus} />} />
          <InfoRow label="Total" value={<span className="text-base font-semibold">{formatCurrency(sale.total)}</span>} />
        </Section>
      </div>

      <Section icon={<MapPin />} title="Envío">
        <p className="text-sm">{sale.shippingAddress ?? 'Sin dirección de envío (retira en local).'}</p>
        {sale.notes && <p className="text-muted-foreground mt-1 text-sm">Nota: {sale.notes}</p>}
      </Section>

      <Section icon={<Package />} title={`Productos (${sale.items.length})`}>
        <ul className="divide-y">
          {sale.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.productName}</p>
                <p className="text-muted-foreground text-xs">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                  {item.productId === null && ' · producto eliminado del catálogo'}
                </p>
              </div>
              <span className="font-medium tabular-nums">{formatCurrency(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={<History />} title="Historial de modificaciones">
        <ol className="grid gap-3">
          {[...sale.history].reverse().map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <Truck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="grid gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <SaleStatusBadge status={event.status} />
                  <span className="text-muted-foreground text-xs">{formatDateTime(event.createdAt)}</span>
                </div>
                {event.note && <p>{event.note}</p>}
                <p className="text-muted-foreground text-xs">Por: {event.createdBy}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <StatusActions sale={sale} />
    </div>
  );
}

function StatusActions({ sale }: { sale: SaleDetailResponse }) {
  const [note, setNote] = useState('');
  const updateStatus = useUpdateSaleStatus();
  const nextStatuses = SALE_STATUS_TRANSITIONS[sale.status];

  if (nextStatuses.length === 0) {
    return (
      <p className="bg-muted/50 text-muted-foreground flex items-center gap-2 rounded-lg p-3 text-sm">
        <CircleCheck className="size-4" />
        Esta venta está cerrada: no admite más cambios de estado.
      </p>
    );
  }

  const change = (status: SaleStatus) =>
    updateStatus.mutate({ id: sale.id, data: { status, note: note.trim() || null } }, { onSuccess: () => setNote('') });

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="grid gap-2">
        <Label htmlFor="status-note">Notas para el cambio de estado (opcional)</Label>
        <Textarea
          id="status-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ej: despachado por Andreani, tracking 123456"
          rows={2}
          maxLength={500}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {nextStatuses.map((status) => (
          <Button
            key={status}
            variant={status === 'CANCELLED' ? 'outline' : 'default'}
            className={status === 'CANCELLED' ? 'text-destructive hover:text-destructive' : undefined}
            disabled={updateStatus.isPending}
            onClick={() => change(status)}
          >
            {updateStatus.isPending && updateStatus.variables?.data.status === status && <Loader2 className="animate-spin" />}
            {ACTION_LABELS[status]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold [&_svg]:size-4">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-12" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
