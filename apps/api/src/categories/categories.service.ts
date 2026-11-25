import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CategoryListQuery,
  CategoryOption,
  CategoryResponse,
  CreateCategoryDto,
  PaginatedResponse,
  UpdateCategoryDto,
} from '@admin/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';

const categoryInclude = {
  parent: { select: { id: true, name: true } },
  _count: { select: { children: true, products: true } },
} satisfies Prisma.CategoryInclude;

type CategoryWithRelations = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CategoryListQuery): Promise<PaginatedResponse<CategoryResponse>> {
    const where: Prisma.CategoryWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};
    // Sin orden elegido: primero las principales y después las subcategorías agrupadas por padre.
    const orderBy: Prisma.CategoryOrderByWithRelationInput[] = query.sortBy
      ? [{ [query.sortBy]: query.sortOrder }]
      : [{ parentId: { sort: 'asc', nulls: 'first' } }, { position: 'asc' }, { name: 'asc' }];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({ where, orderBy, include: categoryInclude, ...toPrismaPage(query) }),
      this.prisma.category.count({ where }),
    ]);

    return paginate(rows.map(toCategoryResponse), total, query);
  }

  /** Todas las categorías, livianas, para llenar selects. */
  async findOptions(): Promise<CategoryOption[]> {
    return this.prisma.category.findMany({
      select: { id: true, name: true, parentId: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number): Promise<CategoryResponse> {
    return toCategoryResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    if (dto.parentId !== null) await this.assertParentExists(dto.parentId);
    await this.assertUniqueName(dto.name, dto.parentId);

    const category = await this.prisma.category.create({ data: dto, include: categoryInclude });
    return toCategoryResponse(category);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const current = await this.getOrThrow(id);
    const parentId = dto.parentId === undefined ? current.parentId : dto.parentId;
    const name = dto.name ?? current.name;

    if (dto.parentId !== undefined && dto.parentId !== null && dto.parentId !== current.parentId) {
      await this.assertParentExists(dto.parentId);
      await this.assertNotDescendant(id, dto.parentId);
    }
    if (name !== current.name || parentId !== current.parentId) {
      await this.assertUniqueName(name, parentId, id);
    }

    const category = await this.prisma.category.update({ where: { id }, data: dto, include: categoryInclude });
    return toCategoryResponse(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.getOrThrow(id);
    const { children, products } = category._count;

    if (children > 0) {
      throw new ConflictException(
        `"${category.name}" tiene ${children} subcategoría(s). Eliminalas o movelas a otra categoría primero.`,
      );
    }
    if (products > 0) {
      throw new ConflictException(
        `"${category.name}" tiene ${products} producto(s) asociados. Cambiales la categoría primero.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }

  private async getOrThrow(id: number): Promise<CategoryWithRelations> {
    const category = await this.prisma.category.findUnique({ where: { id }, include: categoryInclude });
    if (!category) throw new NotFoundException(`La categoría ${id} no existe`);
    return category;
  }

  private async assertParentExists(parentId: number) {
    const exists = await this.prisma.category.count({ where: { id: parentId } });
    if (!exists) throw new BadRequestException('La categoría padre no existe');
  }

  /** Evita ciclos: una categoría no puede colgar de sí misma ni de una de sus subcategorías. */
  private async assertNotDescendant(id: number, newParentId: number) {
    let cursor: number | null = newParentId;
    while (cursor !== null) {
      if (cursor === id) {
        throw new BadRequestException('Una categoría no puede ser padre de sí misma ni de sus subcategorías');
      }
      const node: { parentId: number | null } | null = await this.prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = node?.parentId ?? null;
    }
  }

  /** El nombre no se puede repetir dentro del mismo nivel (ej. dos "Running" bajo "Hombre"). */
  private async assertUniqueName(name: string, parentId: number | null, excludeId?: number) {
    const duplicate = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        parentId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(`Ya existe una categoría "${name}" en ese nivel`);
    }
  }
}

function toCategoryResponse(category: CategoryWithRelations): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    position: category.position,
    parentId: category.parentId,
    parent: category.parent,
    subcategoriesCount: category._count.children,
    productsCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
