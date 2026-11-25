import { z } from 'zod';
import { createListQuerySchema, optionalText, type EntityRef } from './common.js';

const imageUrlSchema = z
  .union([z.url('Ingresá una URL válida (https://...)'), z.literal('')])
  .transform((value) => value || null)
  .nullable();

const productFields = {
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  description: optionalText(1000),
  price: z
    .number({ error: 'Ingresá un precio' })
    .positive('El precio tiene que ser mayor a 0')
    .max(99_999_999, 'Precio demasiado alto'),
  sku: optionalText(40),
  imageUrl: imageUrlSchema,
  categoryId: z.number({ error: 'Elegí una categoría' }).int().positive('Elegí una categoría'),
  brandId: z.number().int().positive().nullable(),
  isActive: z.boolean(),
};

export const createProductSchema = z.object({
  ...productFields,
  description: productFields.description.default(null),
  sku: productFields.sku.default(null),
  imageUrl: productFields.imageUrl.default(null),
  brandId: productFields.brandId.default(null),
  isActive: productFields.isActive.default(true),
});

export const updateProductSchema = z.object(productFields).partial();

export const productListQuerySchema = createListQuerySchema(['name', 'price', 'createdAt'] as const).extend({
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
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
  isActive: boolean;
  category: EntityRef;
  brand: EntityRef | null;
  createdAt: string;
  updatedAt: string;
}

/** Versión liviana para el selector de productos al generar una venta. */
export interface ProductOption extends EntityRef {
  price: number;
  imageUrl: string | null;
}
