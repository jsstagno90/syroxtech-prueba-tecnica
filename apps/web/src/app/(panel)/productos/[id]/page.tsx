import { Suspense } from 'react';
import type { Metadata } from 'next';
import { EditProduct, ProductFormSkeleton } from '@/features/products/product-form';

export const metadata: Metadata = { title: 'Editar producto' };

export default function Page({ params }: PageProps<'/productos/[id]'>) {
  return (
    <Suspense fallback={<ProductFormSkeleton />}>
      <EditProductRoute params={params} />
    </Suspense>
  );
}

async function EditProductRoute({ params }: Pick<PageProps<'/productos/[id]'>, 'params'>) {
  const { id } = await params;
  return <EditProduct productId={Number(id)} />;
}
