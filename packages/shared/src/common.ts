import { z } from 'zod';

/** Texto opcional: recorta espacios y convierte el string vacío en `null`. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((value) => (value === '' ? null : value))
    .nullable();

/** Id numérico que llega como string en la URL (`/categories/12`). */
export const idParamSchema = z.coerce
  .number({ error: 'El id tiene que ser un número' })
  .int('El id tiene que ser un número entero')
  .positive('El id tiene que ser positivo');

/** Búsqueda opcional: un string vacío se trata como "sin búsqueda". */
const searchSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);

/**
 * Query de listado genérica: paginación + búsqueda + orden.
 * Cada recurso declara por qué columnas se puede ordenar, así el back
 * nunca recibe un `sortBy` arbitrario.
 */
export function createListQuerySchema<const T extends readonly [string, ...string[]]>(sortableFields: T) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    search: searchSchema,
    sortBy: z.enum(sortableFields).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  });
}

export type SortOrder = 'asc' | 'desc';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Forma de los errores que devuelve la API. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Referencia liviana a otra entidad (ej. la categoría de un producto). */
export interface EntityRef {
  id: number;
  name: string;
}
