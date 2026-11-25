import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  resolveTier,
  type CreateMembershipTierDto,
  type MembershipTierListQuery,
  type MembershipTierResponse,
  type PaginatedResponse,
  type TierColor,
  type UpdateMembershipTierDto,
} from '@admin/shared';
import type { MembershipTier, Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { CustomersService } from '../customers/customers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  async findAll(query: MembershipTierListQuery): Promise<PaginatedResponse<MembershipTierResponse>> {
    const where: Prisma.MembershipTierWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};
    const [rows, total, allTiers, spent] = await Promise.all([
      this.prisma.membershipTier.findMany({
        where,
        orderBy: { [query.sortBy ?? 'minSpent']: query.sortOrder },
        ...toPrismaPage(query),
      }),
      this.prisma.membershipTier.count({ where }),
      this.prisma.membershipTier.findMany(),
      this.customers.spentByCustomer(),
    ]);

    // Cuántos clientes caen hoy en cada nivel (el nivel depende de todos los demás niveles).
    const counts = new Map<number, number>();
    const tiers = allTiers.map((tier) => ({ id: tier.id, minSpent: toNumber(tier.minSpent) }));
    for (const value of spent) {
      const tier = resolveTier(value, tiers);
      if (tier) counts.set(tier.id, (counts.get(tier.id) ?? 0) + 1);
    }
    return paginate(rows.map((row) => toTierResponse(row, counts.get(row.id) ?? 0)), total, query);
  }

  async create(dto: CreateMembershipTierDto): Promise<MembershipTierResponse> {
    await this.assertUnique(dto);
    return toTierResponse(await this.prisma.membershipTier.create({ data: dto }), 0);
  }

  async update(id: number, dto: UpdateMembershipTierDto): Promise<MembershipTierResponse> {
    await this.getOrThrow(id);
    await this.assertUnique(dto, id);
    return toTierResponse(await this.prisma.membershipTier.update({ where: { id }, data: dto }), 0);
  }

  /** Los clientes del nivel pasan al nivel de abajo (no se guardan asignaciones). */
  async remove(id: number): Promise<void> {
    await this.getOrThrow(id);
    await this.prisma.membershipTier.delete({ where: { id } });
  }

  private async getOrThrow(id: number) {
    const tier = await this.prisma.membershipTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException(`El nivel ${id} no existe`);
    return tier;
  }

  /** Dos niveles con el mismo nombre o el mismo mínimo serían ambiguos. */
  private async assertUnique(dto: UpdateMembershipTierDto, excludeId?: number) {
    const not = excludeId ? { id: { not: excludeId } } : {};
    if (dto.name) {
      const sameName = await this.prisma.membershipTier.findFirst({
        where: { name: { equals: dto.name, mode: 'insensitive' }, ...not },
      });
      if (sameName) throw new ConflictException(`Ya existe el nivel "${dto.name}"`);
    }
    if (dto.minSpent !== undefined) {
      const sameMin = await this.prisma.membershipTier.findFirst({ where: { minSpent: dto.minSpent, ...not } });
      if (sameMin) throw new ConflictException(`El nivel "${sameMin.name}" ya arranca en ese monto`);
    }
  }
}

function toTierResponse(tier: MembershipTier, customersCount: number): MembershipTierResponse {
  return {
    id: tier.id,
    name: tier.name,
    minSpent: toNumber(tier.minSpent),
    pointsMultiplier: toNumber(tier.pointsMultiplier),
    benefits: tier.benefits,
    color: tier.color as TierColor,
    customersCount,
    createdAt: tier.createdAt.toISOString(),
    updatedAt: tier.updatedAt.toISOString(),
  };
}
