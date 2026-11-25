'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWatch, type DefaultValues } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { createProductSchema, type CreateProductInput, type ProductResponse } from '@admin/shared';
import { NumberField, SelectField, SwitchField, TextField, TextareaField } from '@/components/form/fields';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { applyServerErrors, useZodForm } from '@/hooks/use-zod-form';
import { brandHooks } from '@/features/brands/api';
import { buildCategoryPaths, categoryHooks } from '@/features/categories/api';
import { productHooks } from './api';
import { ProductThumb } from './product-thumb';

// Precio y categoría arrancan vacíos a propósito: el schema obliga a completarlos.
const EMPTY_PRODUCT: DefaultValues<CreateProductInput> = {
  name: '',
  description: '',
  sku: '',
  imageUrl: '',
  brandId: null,
  isActive: true,
};

function toFormValues(product: ProductResponse): CreateProductInput {
  return {
    name: product.name,
    description: product.description ?? '',
    price: product.price,
    sku: product.sku ?? '',
    imageUrl: product.imageUrl ?? '',
    categoryId: product.category.id,
    brandId: product.brand?.id ?? null,
    isActive: product.isActive,
  };
}

/** Alta y edición de productos en una página propia (como en el diseño de referencia). */
export function ProductForm({ product }: { product?: ProductResponse }) {
  const router = useRouter();
  const form = useZodForm(createProductSchema, product ? toFormValues(product) : EMPTY_PRODUCT);
  const create = productHooks.useCreate();
  const update = productHooks.useUpdate();
  const { data: categories = [] } = categoryHooks.useOptions();
  const { data: brands = [] } = brandHooks.useOptions();
  const imageUrl = useWatch({ control: form.control, name: 'imageUrl' });
  const name = useWatch({ control: form.control, name: 'name' });

  const categoryOptions = useMemo(
    () => buildCategoryPaths(categories).map((category) => ({ value: category.id, label: category.path })),
    [categories],
  );
  const brandOptions = useMemo(() => brands.map((brand) => ({ value: brand.id, label: brand.name })), [brands]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (product) await update.mutateAsync({ id: product.id, data: values });
      else await create.mutateAsync(values);
      // Next 16 conserva las páginas visitadas ocultas (Activity): sin este reset,
      // al volver a "Nuevo producto" aparecerían los datos del alta anterior.
      if (!product) form.reset(EMPTY_PRODUCT);
      router.push('/productos');
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={product ? 'Editar producto' : 'Crear producto'}
        description={product ? `SKU ${product.sku ?? 'sin asignar'}` : 'Completá los datos para publicarlo en el catálogo.'}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/productos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {product ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
              <CardDescription>Nombre y descripción que se muestran en la tienda.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <TextField control={form.control} name="name" label="Nombre del producto" placeholder="Ej: Zapatillas Nike Air Max 90" required />
              <TextareaField
                control={form.control}
                name="description"
                label="Descripción"
                placeholder="Descripción detallada del producto"
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precio y clasificación</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumberField control={form.control} name="price" label="Precio" placeholder="0,00" min={0} step="0.01" required />
              <TextField control={form.control} name="sku" label="SKU" placeholder="Código interno (opcional)" />
              <SelectField
                control={form.control}
                name="categoryId"
                label="Categoría"
                placeholder="Seleccioná una categoría"
                options={categoryOptions}
                required
              />
              <SelectField
                control={form.control}
                name="brandId"
                label="Marca"
                placeholder="Seleccioná una marca"
                noneLabel="Sin marca"
                options={brandOptions}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Imagen</CardTitle>
              <CardDescription>Pegá la URL de una imagen pública.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="bg-muted/40 grid aspect-square place-items-center overflow-hidden rounded-lg border">
                <ProductThumb
                  key={imageUrl ?? ''}
                  src={imageUrl || null}
                  alt={name || 'Vista previa'}
                  className="size-full rounded-none border-0 [&_svg]:size-8"
                />
              </div>
              <TextField control={form.control} name="imageUrl" label="URL de la imagen" placeholder="https://..." type="url" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publicación</CardTitle>
            </CardHeader>
            <CardContent>
              <SwitchField
                control={form.control}
                name="isActive"
                label="Producto activo"
                description="Los inactivos no se pueden vender."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

export function ProductFormSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

/** Carga el producto y muestra el formulario de edición. */
export function EditProduct({ productId }: { productId: number }) {
  const { data, isLoading, isError } = productHooks.useDetail(Number.isInteger(productId) ? productId : undefined);

  if (isLoading) return <ProductFormSkeleton />;
  if (isError || !data) {
    return (
      <div className="grid place-items-center gap-3 py-24 text-center">
        <p className="text-lg font-semibold">No encontramos el producto</p>
        <Button variant="outline" asChild>
          <Link href="/productos">Volver al listado</Link>
        </Button>
      </div>
    );
  }
  // La key remonta el formulario si el producto cambió (ej. se editó desde otra pestaña).
  return <ProductForm key={data.updatedAt} product={data} />;
}
