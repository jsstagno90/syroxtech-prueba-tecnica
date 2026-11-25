import type { Metadata } from 'next';
import { ProductForm } from '@/features/products/product-form';

export const metadata: Metadata = { title: 'Nuevo producto' };

export default function Page() {
  return <ProductForm />;
}
