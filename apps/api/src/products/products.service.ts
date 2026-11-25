import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BulkDeleteProductsDto,
  BulkProductsResult,
  BulkUpdateProductsDto,
  CreateProductDto,
  PaginatedResponse,
  ProductListQuery,
  ProductOption,
  ProductResponse,
  UpdateProductDto,
} from '@admin/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';

const productInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
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
    const product = await this.prisma.product.create({ data: dto, include: productInclude });
    return toProductResponse(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductResponse> {
    await this.getOrThrow(id);
    await this.assertRelationsExist(dto.categoryId, dto.brandId);
    const product = await this.prisma.product.update({ where: { id }, data: dto, include: productInclude });
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

function toProductResponse(product: ProductWithRelations): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: toNumber(product.price),
    sku: product.sku,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    category: product.category,
    brand: product.brand,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
