import { PAYMENT_METHOD_LABELS, type SaleResponse } from '@admin/shared';
import { RowActions } from '@/components/crud/row-actions';
import type { Column } from '@/components/data-table/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatDate, initials } from '@/lib/format';
import type { SaleSortKey } from './api';
import { SaleStatusMenu } from './sale-status-menu';
import { PaymentStatusBadge } from './status-badges';

export function getSaleColumns({ onView }: { onView: (sale: SaleResponse) => void }): Column<SaleResponse>[] {
  return [
    {
      id: 'customer',
      header: 'Cliente',
      sortKey: 'customerName' satisfies SaleSortKey,
      cell: (sale) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials(sale.customerName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium">{sale.customerName}</p>
            <p className="text-muted-foreground text-xs">{sale.customerEmail}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'order',
      header: 'Número de orden',
      sortKey: 'createdAt' satisfies SaleSortKey,
      cell: (sale) => (
        <div>
          <p className="font-mono text-xs font-medium">#{sale.orderNumber}</p>
          <p className="text-muted-foreground text-xs">{formatDate(sale.createdAt)}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (sale) => <SaleStatusMenu sale={sale} />,
    },
    {
      id: 'total',
      header: 'Total',
      sortKey: 'total' satisfies SaleSortKey,
      cell: (sale) => (
        <div className="text-right">
          <p className="font-medium tabular-nums">{formatCurrency(sale.total)}</p>
          <p className="text-muted-foreground text-xs">
            {PAYMENT_METHOD_LABELS[sale.paymentMethod]} · {sale.itemsCount} {sale.itemsCount === 1 ? 'ítem' : 'ítems'}
          </p>
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      id: 'payment',
      header: 'Pago',
      cell: (sale) => <PaymentStatusBadge status={sale.paymentStatus} />,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      cell: (sale) => <RowActions label={`venta ${sale.orderNumber}`} onView={() => onView(sale)} />,
      className: 'w-16',
    },
  ];
}
