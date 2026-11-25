import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  SALE_STATUS_LABELS,
  calculateSaleTotals,
  canTransitionSale,
  type AuthUser,
  type CreateSaleDto,
  type PaginatedResponse,
  type SaleDetailResponse,
  type SaleListQuery,
  type SaleResponse,
  type UpdateSaleStatusDto,
} from '@admin/shared';
import { Prisma } from '../generated/prisma/client.js';
import { toNumber } from '../common/http/decimal.js';
import { paginate, toPrismaPage } from '../common/http/pagination.js';
import { DiscountsService } from '../discounts/discounts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const saleListInclude = { _count: { select: { items: true } } } satisfies Prisma.SaleInclude;
const saleDetailInclude = {
  ...saleListInclude,
  items: { orderBy: { id: 'asc' } },
  history: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.SaleInclude;

type SaleRow = Prisma.SaleGetPayload<{ include: typeof saleListInclude }>;
type SaleDetailRow = Prisma.SaleGetPayload<{ include: typeof saleDetailInclude }>;

const ORDER_NUMBER_ATTEMPTS = 3;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discounts: DiscountsService,
  ) {}

  async findAll(query: SaleListQuery): Promise<PaginatedResponse<SaleResponse>> {
    const filters: Prisma.SaleWhereInput[] = [];
    if (query.search) {
      filters.push({
        OR: [
          { customerName: { contains: query.search, mode: 'insensitive' } },
          { customerEmail: { contains: query.search, mode: 'insensitive' } },
          { orderNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.status) filters.push({ status: query.status });
    if (query.paymentStatus) filters.push({ paymentStatus: query.paymentStatus });
    const where: Prisma.SaleWhereInput = { AND: filters };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        // Sin orden explícito, las más nuevas primero.
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortBy ? query.sortOrder : 'desc' },
        include: saleListInclude,
        ...toPrismaPage(query),
      }),
      this.prisma.sale.count({ where }),
    ]);

    return paginate(rows.map(toSaleResponse), total, query);
  }

  async findOne(id: number): Promise<SaleDetailResponse> {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: saleDetailInclude });
    if (!sale) throw new NotFoundException(`La venta ${id} no existe`);
    return toSaleDetailResponse(sale);
  }

  /**
   * "Generar venta": los precios salen de la base, nunca del cliente,
   * y la venta, sus ítems y el primer registro del historial se guardan en una sola operación.
   */
  async create(dto: CreateSaleDto, user: AuthUser): Promise<SaleDetailResponse> {
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, isActive: true },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    const missing = productIds.filter((id) => !byId.has(id));
    if (missing.length) {
      throw new BadRequestException(`Productos inexistentes: ${missing.join(', ')}`);
    }
    const inactive = products.filter((product) => !product.isActive);
    if (inactive.length) {
      throw new BadRequestException(`No se pueden vender productos inactivos: ${inactive.map((p) => p.name).join(', ')}`);
    }

    const saleLines = dto.items.map((item) => {
      const product = byId.get(item.productId)!;
      return { product, quantity: item.quantity, unitPrice: toNumber(product.price) };
    });
    // El cupón se valida contra el subtotal real (precios de la base) y el descuento lo calcula la API.
    const discount = dto.discountCode
      ? await this.discounts.resolveForSale(dto.discountCode, calculateSaleTotals(saleLines).subtotal)
      : null;
    const { lines, subtotal, discountAmount, total } = calculateSaleTotals(saleLines, discount);

    const { items: _items, discountCode: _code, ...saleData } = dto;
    const data: Omit<Prisma.SaleCreateInput, 'orderNumber'> = {
      ...saleData,
      subtotal,
      discountAmount,
      total,
      ...(discount && { discount: { connect: { id: discount.id } }, discountCode: discount.code }),
      status: 'PENDING',
      items: {
        create: lines.map((line) => ({
          product: { connect: { id: line.product.id } },
          productName: line.product.name,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          subtotal: line.subtotal,
        })),
      },
      history: {
        create: { status: 'PENDING', note: 'Venta generada desde el panel', createdBy: user.name },
      },
    };

    // El número de orden es aleatorio; ante una colisión (muy improbable) se reintenta.
    for (let attempt = 1; ; attempt++) {
      try {
        const sale = await this.prisma.sale.create({
          data: { ...data, orderNumber: generateOrderNumber() },
          include: saleDetailInclude,
        });
        return toSaleDetailResponse(sale);
      } catch (error) {
        const isOrderNumberCollision =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!isOrderNumberCollision || attempt >= ORDER_NUMBER_ATTEMPTS) throw error;
      }
    }
  }

  /** Mueve la venta en su flujo (ver SALE_STATUS_TRANSITIONS) y lo deja registrado en el historial. */
  async updateStatus(id: number, dto: UpdateSaleStatusDto, user: AuthUser): Promise<SaleDetailResponse> {
    const sale = await this.prisma.sale.findUnique({ where: { id }, select: { status: true, paymentStatus: true } });
    if (!sale) throw new NotFoundException(`La venta ${id} no existe`);

    if (!canTransitionSale(sale.status, dto.status)) {
      throw new BadRequestException(
        `No se puede pasar de "${SALE_STATUS_LABELS[sale.status]}" a "${SALE_STATUS_LABELS[dto.status]}"`,
      );
    }

    // Cancelar una venta cobrada la deja como reembolsada; reabrirla deshace ese reembolso.
    let paymentStatus: 'PAID' | 'REFUNDED' | undefined;
    if (dto.status === 'CANCELLED' && sale.paymentStatus === 'PAID') paymentStatus = 'REFUNDED';
    if (sale.status === 'CANCELLED' && sale.paymentStatus === 'REFUNDED') paymentStatus = 'PAID';

    const updated = await this.prisma.sale.update({
      where: { id },
      data: {
        status: dto.status,
        ...(paymentStatus && { paymentStatus }),
        ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
        history: { create: { status: dto.status, note: dto.note, createdBy: user.name } },
      },
      include: saleDetailInclude,
    });
    return toSaleDetailResponse(updated);
  }
}

/** 8 caracteres hexadecimales en mayúscula, ej. "AB1850E7". */
export function generateOrderNumber(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

export function toSaleResponse(sale: SaleRow): SaleResponse {
  return {
    id: sale.id,
    orderNumber: sale.orderNumber,
    customerName: sale.customerName,
    customerEmail: sale.customerEmail,
    customerPhone: sale.customerPhone,
    shippingAddress: sale.shippingAddress,
    trackingNumber: sale.trackingNumber,
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    status: sale.status,
    notes: sale.notes,
    subtotal: toNumber(sale.subtotal),
    discountCode: sale.discountCode,
    discountAmount: toNumber(sale.discountAmount),
    total: toNumber(sale.total),
    itemsCount: sale._count.items,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}

function toSaleDetailResponse(sale: SaleDetailRow): SaleDetailResponse {
  return {
    ...toSaleResponse(sale),
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: toNumber(item.unitPrice),
      quantity: item.quantity,
      subtotal: toNumber(item.subtotal),
    })),
    history: sale.history.map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      createdBy: event.createdBy,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
