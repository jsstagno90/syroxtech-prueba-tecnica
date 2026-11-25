'use client';

import { PRODUCT_IMPORT_FIELDS, type CategoryOption, type ProductResponse } from '@admin/shared';
import { datedFileName, exportToExcel, fetchAllPages, type ExportColumn } from '@/lib/export-excel';
import { buildCategoryPaths } from '@/features/categories/api';
import { productsApi } from './api';

type ProductQuery = Parameters<typeof productsApi.list>[0];

/**
 * Exporta los productos que coinciden con los filtros actuales.
 * Las columnas son las mismas de la importación: se puede exportar, editar en Excel y volver a importar
 * (los productos con SKU se actualizan).
 */
export async function exportProducts(query: ProductQuery, categories: CategoryOption[]) {
  const products = await fetchAllPages(productsApi.list, query);
  const categoryPath = new Map(buildCategoryPaths(categories).map((category) => [category.id, category.path.replace(/ › /g, ' > ')]));

  const valueOf: Record<(typeof PRODUCT_IMPORT_FIELDS)[number]['key'], ExportColumn<ProductResponse>['value']> = {
    name: (product) => product.name,
    price: (product) => product.price,
    category: (product) => categoryPath.get(product.category.id) ?? product.category.name,
    sku: (product) => product.sku,
    description: (product) => product.description,
    brand: (product) => product.brand?.name,
    imageUrl: (product) => product.imageUrl,
    isActive: (product) => (product.isActive ? 'Sí' : 'No'),
  };
  const widths: Partial<Record<keyof typeof valueOf, number>> = { name: 40, category: 26, description: 50, imageUrl: 50, price: 14 };

  const columns: ExportColumn<ProductResponse>[] = PRODUCT_IMPORT_FIELDS.map((field) => ({
    header: field.label,
    value: valueOf[field.key],
    width: widths[field.key],
    format: field.key === 'price' ? '#,##0.00' : undefined,
  }));

  await exportToExcel(products, columns, { fileName: datedFileName('productos'), sheet: 'Productos' });
  return products.length;
}
