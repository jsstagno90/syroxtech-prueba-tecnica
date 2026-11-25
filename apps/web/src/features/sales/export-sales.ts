'use client';

import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SALE_STATUS_LABELS,
  type SaleResponse,
} from '@admin/shared';
import { datedFileName, exportToExcel, fetchAllPages, type ExportColumn } from '@/lib/export-excel';
import { salesApi } from './api';

type SaleQuery = Parameters<typeof salesApi.list>[0];

const columns: ExportColumn<SaleResponse>[] = [
  { header: 'Orden', value: (sale) => sale.orderNumber, width: 12 },
  { header: 'Fecha', value: (sale) => new Date(sale.createdAt), format: 'dd/mm/yyyy hh:mm', width: 18 },
  { header: 'Cliente', value: (sale) => sale.customerName, width: 26 },
  { header: 'Correo', value: (sale) => sale.customerEmail, width: 30 },
  { header: 'Teléfono', value: (sale) => sale.customerPhone, width: 16 },
  { header: 'Dirección de envío', value: (sale) => sale.shippingAddress, width: 40 },
  { header: 'Estado', value: (sale) => SALE_STATUS_LABELS[sale.status], width: 16 },
  { header: 'Pago', value: (sale) => PAYMENT_STATUS_LABELS[sale.paymentStatus], width: 14 },
  { header: 'Medio de pago', value: (sale) => PAYMENT_METHOD_LABELS[sale.paymentMethod], width: 16 },
  { header: 'Ítems', value: (sale) => sale.itemsCount, width: 8 },
  { header: 'Total', value: (sale) => sale.total, format: '#,##0.00', width: 16 },
];

/** Exporta las ventas que coinciden con la búsqueda y los filtros actuales. */
export async function exportSales(query: SaleQuery) {
  const sales = await fetchAllPages(salesApi.list, query);
  await exportToExcel(sales, columns, { fileName: datedFileName('ventas'), sheet: 'Ventas' });
  return sales.length;
}
