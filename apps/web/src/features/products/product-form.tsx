'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useWatch, type DefaultValues } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import {
  PRODUCT_GENDERS,
  PRODUCT_GENDER_LABELS,
  createProductSchema,
  type CreateProductInput,
  type ProductResponse,
  type ProductVariantInput,
  type VariantOption,
} from '@admin/shared';
import { NumberField, SelectField, SwitchField, TextField, TextareaField } from '@/components/form/fields';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { applyServerErrors, useZodForm } from '@/hooks/use-zod-form';
import { brandHooks } from '@/features/brands/api';
import { buildCategoryPaths, categoryHooks } from '@/features/categories/api';
import { productHooks } from './api';
import { ImageGalleryField } from './image-gallery-field';
import { VariantOptionsEditor, VariantsTable, syncVariants } from './product-variants';

// Precio y categoría arrancan vacíos a propósito: el schema obliga a completarlos.
const EMPTY_PRODUCT: DefaultValues<CreateProductInput> = {
  name: '',
  description: '',
  sku: '',
  images: [],
  gender: null,
  brandId: null,
  isActive: true,
  options: [],
  variants: [],
};

const GENDER_OPTIONS = PRODUCT_GENDERS.map((gender) => ({ value: gender, label: PRODUCT_GENDER_LABELS[gender] }));

function toFormValues(product: ProductResponse): CreateProductInput {
  return {
    name: product.name,
    description: product.description ?? '',
    price: product.price,
    sku: product.sku ?? '',
    images: product.images,
    gender: product.gender,
    categoryId: product.category.id,
    brandId: product.brand?.id ?? null,
    isActive: product.isActive,
    options: product.options,
    variants: product.variants.map(({ options, sku, price, isActive }) => ({ options, sku: sku ?? '', price, isActive })),
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
  const options = (useWatch({ control: form.control, name: 'options' }) ?? []) as VariantOption[];
  const variantsCount = useWatch({ control: form.control, name: 'variants' })?.length ?? 0;
  const price = useWatch({ control: form.control, name: 'price' });
  const errors = form.formState.errors;

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
              {product ? 'Guardar cambios' : variantsCount ? 'Crear producto con variantes' : 'Crear producto'}
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
              <SelectField
                control={form.control}
                name="gender"
                label="Género"
                placeholder="Seleccioná un género"
                noneLabel="Sin especificar"
                options={GENDER_OPTIONS}
                className="sm:max-w-xs"
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

          <Card>
            <CardHeader>
              <CardTitle>Opciones del producto</CardTitle>
              <CardDescription>Definí las características que tienen variaciones (ej: Color, Talla, Material).</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="options"
                render={({ field }) => (
                  <VariantOptionsEditor
                    value={(field.value ?? []) as VariantOption[]}
                    errors={errors.options as never}
                    onChange={(next) => {
                      field.onChange(next);
                      // Cada cambio en las opciones vuelve a armar las combinaciones.
                      form.setValue('variants', syncVariants(next, (form.getValues('variants') ?? []) as ProductVariantInput[]), {
                        shouldValidate: form.formState.isSubmitted,
                      });
                    }}
                  />
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variantes del producto</CardTitle>
              <CardDescription>Se generan solas con las opciones. Cargá SKU o un precio distinto si hace falta.</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="variants"
                render={({ field, fieldState }) => (
                  <VariantsTable
                    options={options}
                    value={(field.value ?? []) as ProductVariantInput[]}
                    onChange={field.onChange}
                    basePrice={typeof price === 'number' ? price : undefined}
                    errors={errors.variants as never}
                    rootError={fieldState.error?.message ?? errors.variants?.root?.message}
                  />
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Imágenes del producto</CardTitle>
              <CardDescription>La primera es la principal: se usa en el listado y en las ventas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="images"
                render={({ field, fieldState }) => (
                  <ImageGalleryField value={(field.value ?? []) as string[]} onChange={field.onChange} error={fieldState.error?.message} />
                )}
              />
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
