'use client';

import { useState, type ReactNode } from 'react';
import { CircleCheck, CreditCard, History, Loader2, MapPin, Package, Truck, Undo2, User } from 'lucide-react';
import {
  PAYMENT_METHOD_LABELS,
  isSaleStatusRollback,
  SALE_STATUS_TRANSITIONS,
  type SaleDetailResponse,
  type SaleStatus,
} from '@admin/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useSaleDetail } from './api';
import { PaymentStatusBadge, SaleStatusBadge } from './status-badges';
import { saleActionLabel, useSaleStatusChange } from './use-sale-status-change';


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
          {sale.discountCode && (
            <>
              <InfoRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
              <InfoRow
                label={`Cupón ${sale.discountCode}`}
                value={<span className="text-emerald-700 dark:text-emerald-400">− {formatCurrency(sale.discountAmount)}</span>}
              />
            </>
          )}
          <InfoRow label="Total" value={<span className="text-base font-semibold">{formatCurrency(sale.total)}</span>} />
        </Section>
      </div>

      <Section icon={<MapPin />} title="Envío">
        <p className="text-sm">{sale.shippingAddress ?? 'Sin dirección de envío (retira en local).'}</p>
        {sale.trackingNumber && (
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Tracking:</span> <span className="font-mono">{sale.trackingNumber}</span>
          </p>
        )}
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
  const [tracking, setTracking] = useState(sale.trackingNumber ?? '');
  const { change, confirmDialog, isPending, pendingStatus } = useSaleStatusChange();
  // Al despacharla se puede cargar el número de seguimiento del correo.
  const canShip = sale.status === 'PREPARING';
  // Orden de los botones: deshacer, cancelar y la acción principal a la derecha.
  const rank = (status: SaleStatus) => (isSaleStatusRollback(sale.status, status) ? 0 : status === 'CANCELLED' ? 1 : 2);
  const nextStatuses = [...SALE_STATUS_TRANSITIONS[sale.status]].sort((a, b) => rank(a) - rank(b));

  if (nextStatuses.length === 0) {
    return (
      <p className="bg-muted/50 text-muted-foreground flex items-center gap-2 rounded-lg p-3 text-sm">
        <CircleCheck className="size-4" />
        Esta venta no admite más cambios de estado.
      </p>
    );
  }

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
      {canShip && (
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="tracking-number">Número de seguimiento (opcional)</Label>
          <Input
            id="tracking-number"
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            placeholder="Ej: AND123456789"
            maxLength={60}
          />
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {nextStatuses.map((status) => {
          const rollback = isSaleStatusRollback(sale.status, status);
          return (
            <Button
              key={status}
              variant={rollback ? 'ghost' : status === 'CANCELLED' ? 'outline' : 'default'}
              className={status === 'CANCELLED' ? 'text-destructive hover:text-destructive' : rollback ? 'sm:mr-auto' : undefined}
              disabled={isPending}
              onClick={() =>
                change(sale, status, {
                  note: note.trim() || null,
                  ...(status === 'SHIPPED' && { trackingNumber: tracking.trim() || null }),
                  onDone: () => setNote(''),
                })
              }
            >
              {isPending && pendingStatus === status ? <Loader2 className="animate-spin" /> : rollback && <Undo2 />}
              {saleActionLabel(sale.status, status)}
            </Button>
          );
        })}
      </div>
      {confirmDialog}
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
