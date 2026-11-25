import type { Metadata } from 'next';
import { DiscountsPage } from '@/features/discounts/discounts-page';

export const metadata: Metadata = { title: 'Descuentos' };

export default function Page() {
  return <DiscountsPage />;
}
