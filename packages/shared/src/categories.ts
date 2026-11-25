import { z } from 'zod';
import { createListQuerySchema, type EntityRef } from './common.js';

const categoryFields = {
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  /** `null` = categoría principal (sin padre). */
  parentId: z.number().int().positive().nullable(),
  position: z
    .number({ error: 'Ingresá un número' })
    .int('Tiene que ser un número entero')
    .min(0, 'No puede ser negativa')
    .max(9999),
};

export const createCategorySchema = z.object({
  ...categoryFields,
  parentId: categoryFields.parentId.default(null),
  position: categoryFields.position.default(0),
});

export const updateCategorySchema = z.object(categoryFields).partial();

export const categoryListQuerySchema = createListQuerySchema(['name', 'position', 'createdAt'] as const).extend({
  /** Solo las hijas directas de esta categoría (para desplegar el árbol). */
  parentId: z.coerce.number().int().positive().optional(),
  /** Solo las categorías principales (sin padre). */
  rootOnly: z.stringbool().optional(),
});

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type CreateCategoryDto = z.output<typeof createCategorySchema>;
export type UpdateCategoryDto = z.output<typeof updateCategorySchema>;
export type CategoryListQuery = z.output<typeof categoryListQuerySchema>;

export interface CategoryResponse {
  id: number;
  name: string;
  position: number;
  parentId: number | null;
  parent: EntityRef | null;
  subcategoriesCount: number;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Versión liviana para selects (ej. "Categoría padre", "Categoría del producto"). */
export interface CategoryOption extends EntityRef {
  parentId: number | null;
}
