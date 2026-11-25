'use client';

import { useState } from 'react';
import { isSaleStatusRollback, type SaleResponse, type SaleStatus } from '@admin/shared';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { useUpdateSaleStatus } from './api';

/** Texto de cada acción según el estado al que lleva. */
export const SALE_ACTION_LABELS: Record<SaleStatus, string> = {
  PENDING: 'Pasar a pendiente',
  PREPARING: 'Pasar a preparación',
  SHIPPED: 'Marcar como enviado',
  COMPLETED: 'Completar pedido',
  CANCELLED: 'Cancelar venta',
};

const ROLLBACK_LABELS: Partial<Record<SaleStatus, string>> = {
  PENDING: 'Volver a pendiente',
  PREPARING: 'Volver a preparación',
  SHIPPED: 'Volver a enviado',
};

/** Texto del botón para ir de `from` a `to`, distinguiendo avanzar, deshacer y reabrir. */
export function saleActionLabel(from: SaleStatus, to: SaleStatus): string {
  if (from === 'CANCELLED') return 'Reabrir como pendiente';
  return isSaleStatusRollback(from, to) ? (ROLLBACK_LABELS[to] ?? SALE_ACTION_LABELS[to]) : SALE_ACTION_LABELS[to];
}

type SaleRef = Pick<SaleResponse, 'id' | 'orderNumber' | 'status' | 'paymentStatus'>;

interface ChangeOptions {
  note?: string | null;
  /** Solo al pasar a Enviado. */
  trackingNumber?: string | null;
  onDone?: () => void;
}

interface PendingConfirm {
  sale: SaleRef;
  status: SaleStatus;
  note: string | null;
  onDone?: () => void;
}

/** Cancelar y reabrir tocan el estado del pago, así que piden confirmación. */
function needsConfirmation(sale: SaleRef, status: SaleStatus) {
  return status === 'CANCELLED' || sale.status === 'CANCELLED';
}

function confirmCopy({ sale, status }: PendingConfirm) {
  if (status === 'CANCELLED') {
    return {
      title: `¿Cancelar la venta #${sale.orderNumber}?`,
      description:
        sale.paymentStatus === 'PAID'
          ? 'Como ya estaba cobrada, el pago queda marcado como reembolsado. Si fue un error, después la podés reabrir.'
          : 'Si fue un error, después la podés reabrir.',
      confirmLabel: 'Sí, cancelar venta',
      destructive: true,
    };
  }
  return {
    title: `¿Reabrir la venta #${sale.orderNumber}?`,
    description:
      sale.paymentStatus === 'REFUNDED'
        ? 'Vuelve a quedar pendiente y el pago pasa de reembolsado a pagado.'
        : 'Vuelve a quedar pendiente para seguir su flujo normal.',
    confirmLabel: 'Sí, reabrir venta',
    destructive: false,
  };
}

/**
 * Cambia el estado de una venta. Cancelar y reabrir piden confirmación;
 * el resto de los pasos se aplican directo. Se usa desde la tabla y desde el detalle.
 */
export function useSaleStatusChange() {
  const updateStatus = useUpdateSaleStatus();
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const change = (
    sale: SaleRef,
    status: SaleStatus,
    options: ChangeOptions = {},
  ) => {
    const note = options.note ?? null;
    if (needsConfirmation(sale, status)) {
      setPending({ sale, status, note, onDone: options.onDone });
      return;
    }
    const data = { status, note, ...(options.trackingNumber !== undefined && { trackingNumber: options.trackingNumber }) };
    updateStatus.mutate({ id: sale.id, data }, { onSuccess: options.onDone });
  };

  const copy = pending ? confirmCopy(pending) : null;

  const confirmDialog = (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => !open && setPending(null)}
      title={copy?.title ?? ''}
      description={copy?.description}
      confirmLabel={copy?.confirmLabel}
      cancelLabel="Volver"
      destructive={copy?.destructive}
      loading={updateStatus.isPending}
      onConfirm={() => {
        if (!pending) return;
        const { sale, status, note, onDone } = pending;
        updateStatus.mutate(
          { id: sale.id, data: { status, note } },
          {
            onSuccess: () => {
              setPending(null);
              onDone?.();
            },
          },
        );
      }}
    />
  );

  return { change, confirmDialog, isPending: updateStatus.isPending, pendingStatus: updateStatus.variables?.data.status };
}
