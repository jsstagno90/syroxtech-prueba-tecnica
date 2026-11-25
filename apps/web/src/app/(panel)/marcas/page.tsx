import type { Metadata } from 'next';
import { BrandsPage } from '@/features/brands/brands-page';

export const metadata: Metadata = { title: 'Marcas' };

export default function Page() {
  return <BrandsPage />;
}
