import {
  PAYMENT_STATUS_LABELS,
  SALE_STATUS_LABELS,
  type PaymentStatus,
  type SaleStatus,
} from '@admin/shared';
import { Badge, type BadgeVariant } from '@/components/ui/badge';

const SALE_STATUS_VARIANT: Record<SaleStatus, BadgeVariant> = {
  PENDING: 'neutral',
  PREPARING: 'warning',
  SHIPPED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  PENDING: 'outline',
  PAID: 'default',
  FAILED: 'destructive',
  REFUNDED: 'secondary',
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return <Badge variant={SALE_STATUS_VARIANT[status]}>{SALE_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
