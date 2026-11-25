import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DISCOUNT_STATUS_LABELS,
  getDiscountStatus,
  todayInStore,
  type CreateDiscountDto,
  type DiscountListQuery,
  type DiscountOption,
  type DiscountResponse,
  type PaginatedResponse,
  type UpdateDiscountDto,
} from '@admin/shared';
import type { Discount, Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Usos que cuentan: ventas con el cupón que no se cancelaron. */
const usedCountSelect = {
  _count: { select: { sales: { where: { status: { not: 'CANCELLED' } } } } },
} satisfies Prisma.DiscountInclude;

type DiscountRow = Discount & { _count: { sales: number } };

/** Las fechas del formulario son días de la tienda (Argentina, UTC-3 todo el año). */
const startOfDay = (date: string) => new Date(`${date}T00:00:00-03:00`);
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999-03:00`);

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El estado depende de la fecha y de los usos, así que se calcula en memoria.
   * Para un listado de cupones (decenas, no miles) es lo más simple y claro.
   */
  async findAll(query: DiscountListQuery): Promise<PaginatedResponse<DiscountResponse>> {
    const where: Prisma.DiscountWhereInput = query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const rows = await this.prisma.discount.findMany({
      where,
      orderBy: { [query.sortBy ?? 'createdAt']: query.sortBy ? query.sortOrder : 'desc' },
      include: usedCountSelect,
    });
    const all = rows.map(toDiscountResponse).filter((discount) => !query.status || discount.status === query.status);
    const { skip, take } = toPrismaPage(query);
    return paginate(all.slice(skip, skip + take), all.length, query);
  }

  /** Cupones que se pueden usar hoy. */
  async findOptions(): Promise<DiscountOption[]> {
    const rows = await this.prisma.discount.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, include: usedCountSelect });
    return rows
      .map(toDiscountResponse)
      .filter((discount) => discount.status === 'ACTIVE')
      .map(({ id, code, description, type, value, minPurchase }) => ({ id, code, description, type, value, minPurchase }));
  }

  async findOne(id: number): Promise<DiscountResponse> {
    return toDiscountResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateDiscountDto): Promise<DiscountResponse> {
    await this.assertUniqueCode(dto.code);
    const row = await this.prisma.discount.create({ data: toDiscountData(dto) as Prisma.DiscountCreateInput, include: usedCountSelect });
    return toDiscountResponse(row);
  }

  async update(id: number, dto: UpdateDiscountDto): Promise<DiscountResponse> {
    const current = await this.getOrThrow(id);
    if (dto.code) await this.assertUniqueCode(dto.code, id);
    // Las reglas cruzadas se revisan con el resultado final, no solo con lo que cambió.
    const merged = { ...toDiscountResponse(current), ...dto };
    if (merged.type === 'PERCENTAGE' && merged.value > 100) {
      throw new BadRequestException('Un porcentaje no puede superar 100');
    }
    if (merged.startsAt && merged.endsAt && merged.endsAt < merged.startsAt) {
      throw new BadRequestException('La fecha de fin tiene que ser posterior al inicio');
    }
    const row = await this.prisma.discount.update({ where: { id }, data: toDiscountData(dto), include: usedCountSelect });
    return toDiscountResponse(row);
  }

  /** Las ventas que lo usaron conservan el código y el monto descontado. */
  async remove(id: number): Promise<void> {
    await this.getOrThrow(id);
    await this.prisma.discount.delete({ where: { id } });
  }

  /** Valida un cupón para una venta y devuelve sus datos, o explica por qué no se puede usar. */
  async resolveForSale(code: string, subtotal: number, tx: Prisma.TransactionClient = this.prisma) {
    const row = await tx.discount.findUnique({ where: { code }, include: usedCountSelect });
    if (!row) throw new BadRequestException(`El cupón ${code} no existe`);
    const discount = toDiscountResponse(row);
    if (discount.status !== 'ACTIVE') {
      throw new BadRequestException(`El cupón ${code} no se puede usar: está ${DISCOUNT_STATUS_LABELS[discount.status].toLowerCase()}`);
    }
    if (discount.minPurchase !== null && subtotal < discount.minPurchase) {
      throw new BadRequestException(`El cupón ${code} pide una compra mínima de $${discount.minPurchase.toLocaleString('es-AR')}`);
    }
    return discount;
  }

  private async getOrThrow(id: number): Promise<DiscountRow> {
    const row = await this.prisma.discount.findUnique({ where: { id }, include: usedCountSelect });
    if (!row) throw new NotFoundException(`El cupón ${id} no existe`);
    return row;
  }

  private async assertUniqueCode(code: string, excludeId?: number) {
    const duplicate = await this.prisma.discount.findFirst({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException(`Ya existe el cupón ${code}`);
  }
}

function toDiscountData(dto: UpdateDiscountDto): Prisma.DiscountUpdateInput {
  const { startsAt, endsAt, ...rest } = dto;
  return {
    ...rest,
    ...(startsAt !== undefined && { startsAt: startsAt ? startOfDay(startsAt) : null }),
    ...(endsAt !== undefined && { endsAt: endsAt ? endOfDay(endsAt) : null }),
  };
}

export function toDiscountResponse(row: DiscountRow): DiscountResponse {
  const base = {
    id: row.id,
    code: row.code,
    description: row.description,
    type: row.type,
    value: toNumber(row.value),
    minPurchase: row.minPurchase === null ? null : toNumber(row.minPurchase),
    usageLimit: row.usageLimit,
    usedCount: row._count.sales,
    startsAt: row.startsAt ? todayInStore(row.startsAt) : null,
    endsAt: row.endsAt ? todayInStore(row.endsAt) : null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  return { ...base, status: getDiscountStatus(base) };
}
