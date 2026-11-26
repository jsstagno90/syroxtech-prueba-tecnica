import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BulkDeleteProductsDto,
  BulkPriceChangeDto,
  BulkProductsResult,
  BulkUpdateProductsDto,
  CreateProductDto,
  PaginatedResponse,
  ProductListQuery,
  ProductOption,
  ProductResponse,
  UpdateProductDto,
  VariantOption,
} from '@admin/shared';
import { applyPriceChange } from '@admin/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';

const productInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  variants: { orderBy: { position: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductListQuery): Promise<PaginatedResponse<ProductResponse>> {
    const where: Prisma.ProductWhereInput = { AND: buildFilters(query) };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortBy ? query.sortOrder : 'desc' },
        include: productInclude,
        ...toPrismaPage(query),
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(rows.map(toProductResponse), total, query);
  }

  /** Productos activos para el selector de "Generar venta". */
  async findOptions(): Promise<ProductOption[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, imageUrl: true },
      orderBy: { name: 'asc' },
    });
    return products.map((product) => ({ ...product, price: toNumber(product.price) }));
  }

  async findOne(id: number): Promise<ProductResponse> {
    return toProductResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    await this.assertRelationsExist(dto.categoryId, dto.brandId);
    await this.assertVariantSkusFree(dto.variants);
    const { data, variants } = toProductData(dto);
    const product = await this.prisma.product.create({
      data: { ...(data as Prisma.ProductUncheckedCreateInput), variants: { create: toVariantRows(variants ?? []) } },
      include: productInclude,
    });
    return toProductResponse(product);
  }

  /** Si vienen variantes se reemplazan todas (las ventas no las referencian, así que no se pierde nada). */
  async update(id: number, dto: UpdateProductDto): Promise<ProductResponse> {
    await this.getOrThrow(id);
    await this.assertRelationsExist(dto.categoryId, dto.brandId);
    await this.assertVariantSkusFree(dto.variants, id);
    const { data, variants } = toProductData(dto);
    const product = await this.prisma.$transaction(async (tx) => {
      if (variants) await tx.productVariant.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: { ...data, ...(variants && { variants: { create: toVariantRows(variants) } }) },
        include: productInclude,
      });
    });
    return toProductResponse(product);
  }

  /** Las ventas pasadas no se rompen: guardan nombre y precio del producto al momento de la venta. */
  async remove(id: number): Promise<void> {
    await this.getOrThrow(id);
    await this.prisma.product.delete({ where: { id } });
  }

  /** Cambia categoría, marca o estado de varios productos en una sola operación. */
  async bulkUpdate({ ids, data }: BulkUpdateProductsDto): Promise<BulkProductsResult> {
    await this.assertAllExist(ids);
    await this.assertRelationsExist(data.categoryId, data.brandId);
    const { count } = await this.prisma.product.updateMany({ where: { id: { in: ids } }, data });
    return { count };
  }

  /**
   * Sube o baja el precio de varios productos en un porcentaje, con el redondeo elegido.
   * Las variantes con precio propio se ajustan igual; las que usan el del producto lo siguen solas.
   */
  async bulkChangePrice({ ids, percent, roundTo }: BulkPriceChangeDto): Promise<BulkProductsResult> {
    await this.assertAllExist(ids);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, price: true, variants: { where: { price: { not: null } }, select: { id: true, price: true } } },
    });
    const variants = products.flatMap((product) => product.variants);

    await this.prisma.$transaction(
      [
        ...products.map((product) =>
          this.prisma.product.update({
            where: { id: product.id },
            data: { price: applyPriceChange(toNumber(product.price), percent, roundTo) },
          }),
        ),
        ...variants.map((variant) =>
          this.prisma.productVariant.update({
            where: { id: variant.id },
            data: { price: applyPriceChange(toNumber(variant.price!), percent, roundTo) },
          }),
        ),
      ],
    );
    return { count: products.length, variants: variants.length };
  }

  /** Igual que el borrado individual: las ventas conservan su copia del nombre y el precio. */
  async bulkRemove({ ids }: BulkDeleteProductsDto): Promise<BulkProductsResult> {
    await this.assertAllExist(ids);
    const { count } = await this.prisma.product.deleteMany({ where: { id: { in: ids } } });
    return { count };
  }

  /** Todo o nada: si falta alguno no se toca ninguno (pudo haberlo borrado otra persona). */
  private async assertAllExist(ids: number[]) {
    const found = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (found.length === ids.length) return;
    const existing = new Set(found.map((product) => product.id));
    const missing = ids.filter((id) => !existing.has(id));
    throw new NotFoundException(
      missing.length === 1 ? `El producto ${missing[0]} ya no existe` : `Estos productos ya no existen: ${missing.join(', ')}`,
    );
  }

  private async getOrThrow(id: number): Promise<ProductWithRelations> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException(`El producto ${id} no existe`);
    return product;
  }

  /** Un SKU de variante no puede estar usado por la variante de otro producto. */
  private async assertVariantSkusFree(variants: UpdateProductDto['variants'], productId?: number) {
    const skus = (variants ?? []).map((variant) => variant.sku).filter((sku): sku is string => !!sku);
    if (!skus.length) return;
    const taken = await this.prisma.productVariant.findFirst({
      where: { sku: { in: skus }, ...(productId && { productId: { not: productId } }) },
      select: { sku: true, product: { select: { name: true } } },
    });
    if (taken) throw new ConflictException(`El SKU ${taken.sku} ya lo usa una variante de "${taken.product.name}"`);
  }

  private async assertRelationsExist(categoryId?: number, brandId?: number | null) {
    if (categoryId !== undefined) {
      const category = await this.prisma.category.count({ where: { id: categoryId } });
      if (!category) throw new BadRequestException('La categoría elegida no existe');
    }
    if (brandId !== undefined && brandId !== null) {
      const brand = await this.prisma.brand.count({ where: { id: brandId } });
      if (!brand) throw new BadRequestException('La marca elegida no existe');
    }
  }
}

/** Cada filtro activo suma una condición; Prisma las combina con AND. */
function buildFilters(query: ProductListQuery): Prisma.ProductWhereInput[] {
  const filters: Prisma.ProductWhereInput[] = [];

  if (query.search) {
    filters.push({
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }
  if (query.categoryId) {
    // Filtrar por una categoría principal (ej. "Hombre") también trae los productos de sus subcategorías.
    filters.push({ OR: [{ categoryId: query.categoryId }, { category: { parentId: query.categoryId } }] });
  }
  if (query.brandId) filters.push({ brandId: query.brandId === 'none' ? null : query.brandId });
  if (query.isActive !== undefined) filters.push({ isActive: query.isActive });

  return filters;
}

/**
 * Separa las variantes (relación) del resto y mantiene `imageUrl` y `images` en sintonía:
 * la imagen principal siempre es la primera de la galería.
 */
function toProductData(dto: CreateProductDto | UpdateProductDto) {
  const { variants, options, images, imageUrl, ...rest } = dto;
  const data: Prisma.ProductUncheckedUpdateInput = { ...rest };
  if (images !== undefined) {
    data.images = images;
    data.imageUrl = images[0] ?? null;
  } else if (imageUrl !== undefined) {
    data.imageUrl = imageUrl;
    data.images = imageUrl ? [imageUrl] : [];
  }
  if (options !== undefined) data.options = options;
  return { data, variants };
}

function toVariantRows(variants: NonNullable<UpdateProductDto['variants']>) {
  return variants.map((variant, position) => ({
    options: variant.options,
    sku: variant.sku,
    price: variant.price,
    isActive: variant.isActive,
    position,
  }));
}

function toProductResponse(product: ProductWithRelations): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: toNumber(product.price),
    sku: product.sku,
    imageUrl: product.imageUrl,
    images: product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
    gender: product.gender,
    isActive: product.isActive,
    category: product.category,
    brand: product.brand,
    options: product.options as unknown as VariantOption[],
    variants: product.variants.map((variant) => ({
      id: variant.id,
      options: variant.options as Record<string, string>,
      sku: variant.sku,
      price: variant.price === null ? null : toNumber(variant.price),
      isActive: variant.isActive,
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
