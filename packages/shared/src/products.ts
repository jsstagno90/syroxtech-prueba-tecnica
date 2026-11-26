import { z } from 'zod';
import { createListQuerySchema, optionalText, type EntityRef } from './common.js';

const imageUrlSchema = z
  .union([z.url('Ingresá una URL válida (https://...)'), z.literal('')])
  .transform((value) => value || null)
  .nullable();

/* ------------------------------ Género ------------------------------ */

export const PRODUCT_GENDERS = ['MALE', 'FEMALE', 'UNISEX', 'KIDS'] as const;
export type ProductGender = (typeof PRODUCT_GENDERS)[number];

export const PRODUCT_GENDER_LABELS: Record<ProductGender, string> = {
  MALE: 'Hombre',
  FEMALE: 'Mujer',
  UNISEX: 'Unisex',
  KIDS: 'Niños',
};

/* ------------------------ Opciones y variantes ------------------------ */

export const MAX_VARIANT_OPTIONS = 3;
export const MAX_VARIANTS = 100;
export const MAX_PRODUCT_IMAGES = 8;

/** Una característica que genera variantes, ej. Talla con 38, 39 y 40. */
export const variantOptionSchema = z.object({
  name: z.string().trim().min(1, 'Poné un nombre (ej. Talla)').max(30, 'Máximo 30 caracteres'),
  values: z
    .array(z.string().trim().min(1).max(30, 'Máximo 30 caracteres'))
    .min(1, 'Agregá al menos un valor')
    .max(30, 'Máximo 30 valores'),
});

export const productVariantSchema = z.object({
  /** Valor de cada opción: { Talla: "40", Color: "Negro" }. */
  options: z.record(z.string(), z.string()),
  sku: optionalText(40),
  /** null = usa el precio del producto. */
  price: z.number().positive('El precio tiene que ser mayor a 0').max(99_999_999, 'Precio demasiado alto').nullable(),
  isActive: z.boolean(),
});

export type VariantOption = z.output<typeof variantOptionSchema>;
export type ProductVariantInput = z.input<typeof productVariantSchema>;

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Todas las combinaciones posibles de las opciones, en orden. */
export function buildVariantCombinations(options: VariantOption[]): Record<string, string>[] {
  const valid = options.filter((option) => option.name.trim() && option.values.length);
  if (!valid.length) return [];
  return valid.reduce<Record<string, string>[]>(
    (combos, option) => combos.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name]: value }))),
    [{}],
  );
}

/** "40 / Negro": cómo se muestra una variante. */
export function variantLabel(variantOptions: Record<string, string>, options: Pick<VariantOption, 'name'>[]): string {
  return options.map((option) => variantOptions[option.name] ?? '—').join(' / ');
}

/** Clave estable de una combinación, para conservar SKU y precio cuando se agregan valores. */
export const variantKey = (variantOptions: Record<string, string>, options: Pick<VariantOption, 'name'>[]) =>
  options.map((option) => `${option.name}=${variantOptions[option.name] ?? ''}`).join('|');

/**
 * Reglas que cruzan opciones y variantes: nombres y valores sin repetir,
 * cada variante con un valor válido por opción, sin combinaciones ni SKU duplicados.
 */
function validateVariants(
  data: { options?: VariantOption[]; variants?: z.output<typeof productVariantSchema>[]; sku?: string | null },
  ctx: z.RefinementCtx,
) {
  const options = data.options ?? [];
  const variants = data.variants ?? [];

  options.forEach((option, index) => {
    if (options.findIndex((other) => sameText(other.name, option.name)) !== index) {
      ctx.addIssue({ code: 'custom', path: ['options', index, 'name'], message: 'Ya hay una opción con ese nombre' });
    }
    const repeated = option.values.find((value, i) => option.values.findIndex((other) => sameText(other, value)) !== i);
    if (repeated) {
      ctx.addIssue({ code: 'custom', path: ['options', index, 'values'], message: `"${repeated}" está repetido` });
    }
  });

  if (!options.length && variants.length) {
    ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Las variantes necesitan al menos una opción' });
    return;
  }

  const seen = new Set<string>();
  const skus = new Set<string>(data.sku ? [data.sku.toLowerCase()] : []);
  variants.forEach((variant, index) => {
    const valid =
      Object.keys(variant.options).length === options.length &&
      options.every((option) => option.values.includes(variant.options[option.name] ?? ''));
    if (!valid) {
      ctx.addIssue({ code: 'custom', path: ['variants', index], message: 'La variante no coincide con las opciones' });
    }
    const key = variantKey(variant.options, options);
    if (seen.has(key)) ctx.addIssue({ code: 'custom', path: ['variants', index], message: 'Variante repetida' });
    seen.add(key);
    if (variant.sku) {
      const sku = variant.sku.toLowerCase();
      if (skus.has(sku)) ctx.addIssue({ code: 'custom', path: ['variants', index, 'sku'], message: 'SKU repetido' });
      skus.add(sku);
    }
  });
}

/* ----------------------------- Producto ----------------------------- */

const productFields = {
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  description: optionalText(1000),
  price: z
    .number({ error: 'Ingresá un precio' })
    .positive('El precio tiene que ser mayor a 0')
    .max(99_999_999, 'Precio demasiado alto'),
  sku: optionalText(40),
  /** Imagen principal. Si se mandan `images`, la API usa la primera. */
  imageUrl: imageUrlSchema,
  images: z
    .array(z.url('Imagen con una URL inválida'))
    .max(MAX_PRODUCT_IMAGES, `Máximo ${MAX_PRODUCT_IMAGES} imágenes`),
  gender: z.enum(PRODUCT_GENDERS, { error: 'Género inválido' }).nullable(),
  categoryId: z.number({ error: 'Elegí una categoría' }).int().positive('Elegí una categoría'),
  brandId: z.number().int().positive().nullable(),
  isActive: z.boolean(),
  options: z.array(variantOptionSchema).max(MAX_VARIANT_OPTIONS, `Máximo ${MAX_VARIANT_OPTIONS} opciones`),
  variants: z.array(productVariantSchema).max(MAX_VARIANTS, `Máximo ${MAX_VARIANTS} variantes por producto`),
};

const productObject = z.object(productFields);

export const createProductSchema = productObject
  .extend({
    description: productFields.description.default(null),
    sku: productFields.sku.default(null),
    imageUrl: productFields.imageUrl.default(null),
    images: productFields.images.default([]),
    gender: productFields.gender.default(null),
    brandId: productFields.brandId.default(null),
    isActive: productFields.isActive.default(true),
    options: productFields.options.default([]),
    variants: productFields.variants.default([]),
  })
  .superRefine(validateVariants);

export const updateProductSchema = productObject.partial().superRefine((data, ctx) => {
  // Opciones y variantes viajan juntas: si cambia una, se reemplazan las dos.
  if ((data.options === undefined) !== (data.variants === undefined)) {
    ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Mandá opciones y variantes juntas' });
    return;
  }
  validateVariants(data, ctx);
});

export const productListQuerySchema = createListQuerySchema(['name', 'price', 'createdAt'] as const).extend({
  categoryId: z.coerce.number().int().positive().optional(),
  /** Un id de marca, o "none" para los productos sin marca. */
  brandId: z.union([z.literal('none'), z.coerce.number().int().positive()]).optional(),
  isActive: z.stringbool().optional(),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductDto = z.output<typeof createProductSchema>;
export type UpdateProductDto = z.output<typeof updateProductSchema>;
export type ProductListQuery = z.output<typeof productListQuerySchema>;

export interface ProductResponse {
  id: number;
  name: string;
  description: string | null;
  price: number;
  sku: string | null;
  imageUrl: string | null;
  images: string[];
  gender: ProductGender | null;
  isActive: boolean;
  category: EntityRef;
  brand: EntityRef | null;
  options: VariantOption[];
  variants: ProductVariantResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantResponse {
  id: number;
  options: Record<string, string>;
  sku: string | null;
  price: number | null;
  isActive: boolean;
}

/** Versión liviana para el selector de productos al generar una venta. */
export interface ProductOption extends EntityRef {
  price: number;
  imageUrl: string | null;
}

/* --------------------------- Edición masiva --------------------------- */

const bulkIdsSchema = z
  .array(z.number().int().positive())
  .min(1, 'Elegí al menos un producto')
  .max(500, 'Máximo 500 productos por vez')
  .transform((ids) => [...new Set(ids)]);

/** Mismos campos y reglas que la edición individual, aplicados a varios productos a la vez. */
export const bulkUpdateProductsSchema = z.object({
  ids: bulkIdsSchema,
  data: z
    .object({
      categoryId: productFields.categoryId,
      brandId: productFields.brandId,
      isActive: productFields.isActive,
    })
    .partial()
    .refine((data) => Object.values(data).some((value) => value !== undefined), 'Indicá qué querés cambiar'),
});

export const bulkDeleteProductsSchema = z.object({ ids: bulkIdsSchema });

/* ------------------------ Cambio de precio en % ------------------------ */

/** A cuánto se redondea el precio nuevo (0.01 = sin redondear, al centavo). */
export const PRICE_ROUNDINGS = [0.01, 1, 10, 100] as const;
export type PriceRounding = (typeof PRICE_ROUNDINGS)[number];

export const PRICE_ROUNDING_LABELS: Record<PriceRounding, string> = {
  0.01: 'Sin redondear',
  1: 'Al peso ($1)',
  10: 'A $10',
  100: 'A $100',
};

export const bulkPriceChangeSchema = z.object({
  ids: bulkIdsSchema,
  /** Positivo sube, negativo baja: 10 = +10 %, -15 = -15 %. */
  percent: z
    .number({ error: 'Ingresá un porcentaje' })
    .min(-90, 'No se puede bajar más de 90 %')
    .max(500, 'Máximo 500 %')
    .refine((value) => value !== 0, 'Tiene que ser distinto de 0'),
  roundTo: z.union(PRICE_ROUNDINGS.map((value) => z.literal(value))).default(1),
});

export type BulkPriceChangeInput = z.input<typeof bulkPriceChangeSchema>;
export type BulkPriceChangeDto = z.output<typeof bulkPriceChangeSchema>;

/**
 * Precio nuevo después de aplicar un porcentaje y redondear.
 * Nunca queda en 0: como mínimo vale un escalón de redondeo.
 * Lo usan la API (para guardar) y el panel (para la vista previa), así coinciden siempre.
 */
export function applyPriceChange(price: number, percent: number, roundTo: number = 1): number {
  const cents = Math.round(price * 100 * (1 + percent / 100));
  const step = Math.round(roundTo * 100);
  const rounded = Math.round(cents / step) * step;
  return Math.max(step, rounded) / 100;
}

export type BulkUpdateProductsInput = z.input<typeof bulkUpdateProductsSchema>;
export type BulkUpdateProductsDto = z.output<typeof bulkUpdateProductsSchema>;
export type BulkDeleteProductsInput = z.input<typeof bulkDeleteProductsSchema>;
export type BulkDeleteProductsDto = z.output<typeof bulkDeleteProductsSchema>;

/** Cantidad de productos afectados por una operación masiva. */
export interface BulkProductsResult {
  count: number;
  /** En el cambio de precio: cuántas variantes con precio propio se ajustaron también. */
  variants?: number;
}
