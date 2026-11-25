import { z } from 'zod';

/**
 * Campos que se pueden importar desde un Excel/CSV.
 * `aliases` sirve para adivinar qué columna del archivo corresponde a cada campo
 * (el usuario después puede cambiarlo a mano en el paso de "mapeo").
 */
export const PRODUCT_IMPORT_FIELDS = [
  { key: 'name', label: 'Nombre', required: true, aliases: ['nombre', 'producto', 'name', 'titulo', 'nombre del producto', 'articulo'] },
  { key: 'price', label: 'Precio', required: true, aliases: ['precio', 'price', 'valor', 'precio unitario', 'pvp', 'importe'] },
  { key: 'category', label: 'Categoría', required: true, aliases: ['categoria', 'category', 'rubro', 'subcategoria', 'familia'] },
  { key: 'sku', label: 'SKU', required: false, aliases: ['sku', 'codigo', 'cod', 'code', 'referencia', 'codigo interno'] },
  { key: 'description', label: 'Descripción', required: false, aliases: ['descripcion', 'description', 'detalle'] },
  { key: 'brand', label: 'Marca', required: false, aliases: ['marca', 'brand', 'fabricante'] },
  { key: 'imageUrl', label: 'Imagen (URL)', required: false, aliases: ['imagen', 'image', 'foto', 'url imagen', 'imagen url', 'image url'] },
  { key: 'isActive', label: 'Activo', required: false, aliases: ['activo', 'active', 'estado', 'publicado', 'habilitado'] },
] as const;

export type ProductImportField = (typeof PRODUCT_IMPORT_FIELDS)[number]['key'];

/** "Categoría " → "categoria": sin tildes, minúsculas y sin símbolos, para comparar textos. */
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Propone el mapeo inicial: para cada campo, el índice de la columna del archivo
 * cuyo encabezado coincide con alguno de sus alias (o `null` si ninguna).
 */
export function guessColumnMapping(headers: string[]): Record<ProductImportField, number | null> {
  const normalized = headers.map((header) => normalizeText(header));
  const used = new Set<number>();
  const mapping = {} as Record<ProductImportField, number | null>;

  for (const field of PRODUCT_IMPORT_FIELDS) {
    const aliases = field.aliases.map(normalizeText);
    const index = normalized.findIndex((header, i) => !used.has(i) && aliases.includes(header));
    mapping[field.key] = index === -1 ? null : index;
    if (index !== -1) used.add(index);
  }
  return mapping;
}

const cellSchema = z.union([z.string(), z.number(), z.boolean()]).nullable().optional();

/** Una fila ya mapeada: valores crudos del archivo, la API se encarga de interpretarlos. */
export const productImportRowSchema = z.object({
  /** Número de fila en el archivo, para que los errores digan "fila 7". */
  rowNumber: z.number().int().positive(),
  name: cellSchema,
  price: cellSchema,
  category: cellSchema,
  sku: cellSchema,
  description: cellSchema,
  brand: cellSchema,
  imageUrl: cellSchema,
  isActive: cellSchema,
});

export const importProductsSchema = z.object({
  /** true = solo validar y devolver el resultado (vista previa); false = guardar. */
  dryRun: z.boolean().default(true),
  /** Si una marca del archivo no existe, crearla en lugar de marcar la fila con error. */
  createMissingBrands: z.boolean().default(true),
  rows: z
    .array(productImportRowSchema)
    .min(1, 'El archivo no tiene filas para importar')
    .max(1000, 'Se pueden importar hasta 1000 filas por vez'),
});

export type ProductImportRow = z.input<typeof productImportRowSchema>;
export type ImportProductsInput = z.input<typeof importProductsSchema>;
export type ImportProductsDto = z.output<typeof importProductsSchema>;

export type ProductImportRowStatus = 'create' | 'update' | 'error';

/** Un problema de una fila, atado al campo que hay que corregir. */
export interface ProductImportIssue {
  field: ProductImportField;
  message: string;
  /** Valores posibles para corregirlo (ej. las rutas de categoría que coinciden). */
  suggestions?: string[];
}

export interface ProductImportRowResult {
  rowNumber: number;
  status: ProductImportRowStatus;
  name: string | null;
  errors: ProductImportIssue[];
}

export interface ImportProductsResponse {
  dryRun: boolean;
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    withErrors: number;
    /** Marcas que no existían y se crean (o se crearían) con la importación. */
    newBrands: string[];
  };
  rows: ProductImportRowResult[];
}
