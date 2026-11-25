import { Injectable } from '@nestjs/common';
import {
  createProductSchema,
  normalizeText,
  type CreateProductDto,
  type ImportProductsDto,
  type ImportProductsResponse,
  type ProductImportField,
  type ProductImportIssue,
  type ProductImportRowResult,
} from '@admin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { cellText, closestMatches, createCategoryResolver, parseActive, parsePrice } from './import-parsers.js';

/** Campo del producto (schema) → campo de la importación, para atar cada error a lo que hay que corregir. */
const SCHEMA_FIELD_TO_IMPORT: Record<string, ProductImportField> = {
  name: 'name',
  description: 'description',
  price: 'price',
  sku: 'sku',
  imageUrl: 'imageUrl',
  categoryId: 'category',
  brandId: 'brand',
  isActive: 'isActive',
};

interface ValidRow {
  rowNumber: number;
  data: Omit<CreateProductDto, 'brandId'>;
  /** Nombre normalizado de la marca (se resuelve a un id al guardar, por si hay que crearla). */
  brandKey: string | null;
  /** Si el SKU ya existe, se actualiza ese producto en lugar de crear uno nuevo. */
  existingId: number | null;
}

@Injectable()
export class ProductsImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida todas las filas con las mismas reglas que el alta manual.
   * Con `dryRun` solo devuelve el resultado (vista previa); sin él, guarda las filas válidas en una transacción.
   */
  async import(dto: ImportProductsDto): Promise<ImportProductsResponse> {
    const [categories, brands, productsWithSku] = await Promise.all([
      this.prisma.category.findMany({ select: { id: true, name: true, parentId: true } }),
      this.prisma.brand.findMany({ select: { id: true, name: true } }),
      this.prisma.product.findMany({ where: { sku: { not: null } }, select: { id: true, sku: true } }),
    ]);

    const resolveCategory = createCategoryResolver(categories);
    const brandIds = new Map(brands.map((brand) => [normalizeText(brand.name), brand.id]));
    const productIdBySku = new Map(productsWithSku.map((product) => [product.sku!.toLowerCase(), product.id]));
    const newBrands = new Map<string, string>(); // clave normalizada → nombre como vino en el archivo
    const skuRows = new Map<string, number>();

    const results: ProductImportRowResult[] = [];
    const validRows: ValidRow[] = [];

    const brandNames = brands.map((brand) => brand.name);

    for (const row of dto.rows) {
      const errors: ProductImportIssue[] = [];

      const category = resolveCategory(cellText(row.category));
      if ('error' in category) errors.push({ field: 'category', message: category.error, suggestions: category.suggestions });

      const brandName = cellText(row.brand);
      const brandKey = brandName ? normalizeText(brandName) : null;
      if (brandKey && !brandIds.has(brandKey)) {
        if (dto.createMissingBrands) newBrands.set(brandKey, newBrands.get(brandKey) ?? brandName);
        else
          errors.push({
            field: 'brand',
            message: `La marca "${brandName}" no existe`,
            suggestions: closestMatches(brandName, brandNames),
          });
      }

      const price = parsePrice(row.price);
      if (price === null && cellText(row.price)) {
        errors.push({ field: 'price', message: `"${cellText(row.price)}" no es un número válido` });
      }

      const isActive = parseActive(row.isActive);
      if (isActive === null) {
        errors.push({ field: 'isActive', message: `"${cellText(row.isActive)}" no se entiende`, suggestions: ['Sí', 'No'] });
      }

      const sku = cellText(row.sku);
      const skuKey = sku.toLowerCase();
      if (sku && skuRows.has(skuKey)) {
        errors.push({ field: 'sku', message: `"${sku}" está repetido en el archivo (fila ${skuRows.get(skuKey)})` });
      } else if (sku) skuRows.set(skuKey, row.rowNumber);

      // Las reglas de cada campo son las mismas del formulario de alta (schema compartido).
      const parsed = createProductSchema.safeParse({
        name: cellText(row.name),
        description: cellText(row.description),
        price: price ?? undefined,
        sku,
        imageUrl: cellText(row.imageUrl),
        categoryId: 'id' in category ? category.id : 1,
        brandId: null,
        isActive: isActive ?? true,
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const field = SCHEMA_FIELD_TO_IMPORT[String(issue.path[0])] ?? 'name';
          // Un precio con texto inválido ya se informó arriba con más detalle.
          if (field === 'price' && price === null && cellText(row.price)) continue;
          errors.push({ field, message: issue.message });
        }
      }

      const name = cellText(row.name) || null;
      if (errors.length || !parsed.success) {
        results.push({ rowNumber: row.rowNumber, status: 'error', name, errors });
        continue;
      }

      const existingId = sku ? (productIdBySku.get(skuKey) ?? null) : null;
      const { brandId: _brandId, ...data } = parsed.data;
      validRows.push({ rowNumber: row.rowNumber, data, brandKey, existingId });
      results.push({ rowNumber: row.rowNumber, status: existingId ? 'update' : 'create', name, errors: [] });
    }

    // Solo las marcas que usan filas válidas.
    const usedNewBrands = [...newBrands].filter(([key]) => validRows.some((row) => row.brandKey === key));

    if (!dto.dryRun && validRows.length) {
      await this.prisma.$transaction(async (tx) => {
        for (const [key, name] of usedNewBrands) {
          const brand = await tx.brand.create({ data: { name }, select: { id: true } });
          brandIds.set(key, brand.id);
        }
        for (const row of validRows) {
          const data = { ...row.data, brandId: row.brandKey ? brandIds.get(row.brandKey)! : null };
          if (row.existingId) await tx.product.update({ where: { id: row.existingId }, data });
          else await tx.product.create({ data });
        }
      }, { timeout: 60_000, maxWait: 10_000 });
    }

    return {
      dryRun: dto.dryRun,
      summary: {
        total: results.length,
        toCreate: results.filter((row) => row.status === 'create').length,
        toUpdate: results.filter((row) => row.status === 'update').length,
        withErrors: results.filter((row) => row.status === 'error').length,
        newBrands: usedNewBrands.map(([, name]) => name),
      },
      rows: results,
    };
  }
}
