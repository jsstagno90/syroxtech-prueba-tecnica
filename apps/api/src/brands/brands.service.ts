import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BrandListQuery,
  BrandOption,
  BrandResponse,
  CreateBrandDto,
  PaginatedResponse,
  UpdateBrandDto,
} from '@admin/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';

const brandInclude = { _count: { select: { products: true } } } satisfies Prisma.BrandInclude;
type BrandWithCount = Prisma.BrandGetPayload<{ include: typeof brandInclude }>;

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: BrandListQuery): Promise<PaginatedResponse<BrandResponse>> {
    const where: Prisma.BrandWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        orderBy: { [query.sortBy ?? 'name']: query.sortOrder },
        include: brandInclude,
        ...toPrismaPage(query),
      }),
      this.prisma.brand.count({ where }),
    ]);

    return paginate(rows.map(toBrandResponse), total, query);
  }

  findOptions(): Promise<BrandOption[]> {
    return this.prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }

  async findOne(id: number): Promise<BrandResponse> {
    return toBrandResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateBrandDto): Promise<BrandResponse> {
    await this.assertUniqueName(dto.name);
    return toBrandResponse(await this.prisma.brand.create({ data: dto, include: brandInclude }));
  }

  async update(id: number, dto: UpdateBrandDto): Promise<BrandResponse> {
    await this.getOrThrow(id);
    if (dto.name) await this.assertUniqueName(dto.name, id);
    return toBrandResponse(await this.prisma.brand.update({ where: { id }, data: dto, include: brandInclude }));
  }

  /** Los productos de la marca quedan "sin marca" (la FK es SET NULL). */
  async remove(id: number): Promise<void> {
    await this.getOrThrow(id);
    await this.prisma.brand.delete({ where: { id } });
  }

  private async getOrThrow(id: number): Promise<BrandWithCount> {
    const brand = await this.prisma.brand.findUnique({ where: { id }, include: brandInclude });
    if (!brand) throw new NotFoundException(`La marca ${id} no existe`);
    return brand;
  }

  private async assertUniqueName(name: string, excludeId?: number) {
    const duplicate = await this.prisma.brand.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException(`Ya existe la marca "${name}"`);
  }
}

function toBrandResponse(brand: BrandWithCount): BrandResponse {
  return {
    id: brand.id,
    name: brand.name,
    productsCount: brand._count.products,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}
