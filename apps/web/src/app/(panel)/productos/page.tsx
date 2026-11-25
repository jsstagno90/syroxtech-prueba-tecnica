import type { Metadata } from 'next';
import { ProductsPage } from '@/features/products/products-page';

export const metadata: Metadata = { title: 'Productos' };

export default function Page() {
  return <ProductsPage />;
}
