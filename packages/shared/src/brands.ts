import { z } from 'zod';
import { createListQuerySchema, type EntityRef } from './common.js';

export const createBrandSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
});

export const updateBrandSchema = createBrandSchema.partial();

export const brandListQuerySchema = createListQuerySchema(['name', 'createdAt'] as const);

export type CreateBrandInput = z.input<typeof createBrandSchema>;
export type CreateBrandDto = z.output<typeof createBrandSchema>;
export type UpdateBrandDto = z.output<typeof updateBrandSchema>;
export type BrandListQuery = z.output<typeof brandListQuerySchema>;

export interface BrandResponse {
  id: number;
  name: string;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type BrandOption = EntityRef;
