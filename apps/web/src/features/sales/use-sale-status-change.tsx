'use client';

import { useState } from 'react';
import type { SaleResponse, SaleStatus } from '@admin/shared';
import { ConfirmDialog } from '@/components/crud/confirm-dialog';
import { useUpdateSaleStatus } from './api';

/** Texto de cada acción según el estado al que lleva. */
export const SALE_ACTION_LABELS: Record<SaleStatus, string> = {
  PENDING: 'Volver a pendiente',
  PREPARING: 'Pasar a preparación',
  SHIPPED: 'Marcar como enviado',
  COMPLETED: 'Completar pedido',
  CANCELLED: 'Cancelar venta',
};

interface PendingCancel {
  sale: Pick<SaleResponse, 'id' | 'orderNumber' | 'paymentStatus'>;
  note: string | null;
  onDone?: () => void;
}

/**
 * Cambia el estado de una venta. Cancelar es irreversible, así que pide confirmación;
 * el resto de los pasos se aplican directo. Se usa desde la tabla y desde el detalle.
 */
export function useSaleStatusChange() {
  const updateStatus = useUpdateSaleStatus();
  const [pendingCancel, setPendingCancel] = useState<PendingCancel | null>(null);

  const change = (
    sale: PendingCancel['sale'],
    status: SaleStatus,
    options: { note?: string | null; onDone?: () => void } = {},
  ) => {
    const note = options.note ?? null;
    if (status === 'CANCELLED') {
      setPendingCancel({ sale, note, onDone: options.onDone });
      return;
    }
    updateStatus.mutate({ id: sale.id, data: { status, note } }, { onSuccess: options.onDone });
  };

  const confirmDialog = (
    <ConfirmDialog
      open={pendingCancel !== null}
      onOpenChange={(open) => !open && setPendingCancel(null)}
      title={`¿Cancelar la venta #${pendingCancel?.sale.orderNumber ?? ''}?`}
      description={
        <>
          Esta acción no se puede deshacer.
          {pendingCancel?.sale.paymentStatus === 'PAID' && ' Como ya estaba cobrada, el pago queda marcado como reembolsado.'}
        </>
      }
      confirmLabel="Sí, cancelar venta"
      destructive
      loading={updateStatus.isPending}
      onConfirm={() => {
        if (!pendingCancel) return;
        const { sale, note, onDone } = pendingCancel;
        updateStatus.mutate(
          { id: sale.id, data: { status: 'CANCELLED', note } },
          {
            onSuccess: () => {
              setPendingCancel(null);
              onDone?.();
            },
          },
        );
      }}
    />
  );

  return { change, confirmDialog, isPending: updateStatus.isPending, pendingStatus: updateStatus.variables?.data.status };
}
