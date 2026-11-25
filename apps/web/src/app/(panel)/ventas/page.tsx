import type { Metadata } from 'next';
import { SalesPage } from '@/features/sales/sales-page';

export const metadata: Metadata = { title: 'Ventas' };

export default function Page() {
  return <SalesPage />;
}
