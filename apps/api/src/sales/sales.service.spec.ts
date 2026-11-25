import { BadRequestException } from '@nestjs/common';
import { calculateSaleTotals, type CreateSaleDto } from '@admin/shared';
import { Prisma } from '../generated/prisma/client.js';
import type { DiscountsService } from '../discounts/discounts.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SalesService, generateOrderNumber } from './sales.service.js';

const user = { id: 1, email: 'admin@demo.com', name: 'Administrador' };

const baseSale: CreateSaleDto = {
  customerName: 'Juan Pérez',
  customerEmail: 'juan@test.com',
  customerPhone: null,
  shippingAddress: null,
  paymentMethod: 'CARD',
  paymentStatus: 'PAID',
  notes: null,
  discountCode: null,
  items: [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 1 },
  ],
};

function createPrismaMock() {
  return {
    product: { findMany: vi.fn() },
    sale: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
}

/** Lo mínimo que devuelve Prisma para que el mapper arme la respuesta. */
function fakeSaleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    orderNumber: 'AB1850E7',
    customerName: 'Juan Pérez',
    customerEmail: 'juan@test.com',
    customerPhone: null,
    shippingAddress: null,
    paymentMethod: 'CARD',
    paymentStatus: 'PAID',
    status: 'PENDING',
    notes: null,
    trackingNumber: null,
    subtotal: new Prisma.Decimal(0),
    discountCode: null,
    discountAmount: new Prisma.Decimal(0),
    total: new Prisma.Decimal(0),
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { items: 0 },
    items: [],
    history: [],
    ...overrides,
  };
}

describe('calculateSaleTotals', () => {
  it('suma en centavos para no arrastrar errores de coma flotante', () => {
    const { total, lines } = calculateSaleTotals([
      { unitPrice: 0.1, quantity: 3 },
      { unitPrice: 0.2, quantity: 1 },
    ]);
    expect(total).toBe(0.5);
    expect(lines.map((line) => line.subtotal)).toEqual([0.3, 0.2]);
  });
});

describe('generateOrderNumber', () => {
  it('devuelve 8 caracteres hexadecimales en mayúscula', () => {
    expect(generateOrderNumber()).toMatch(/^[0-9A-F]{8}$/);
  });
});

describe('SalesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SalesService;
  const discounts = { resolveForSale: vi.fn() };

  beforeEach(() => {
    prisma = createPrismaMock();
    discounts.resolveForSale.mockReset();
    service = new SalesService(prisma as unknown as PrismaService, discounts as unknown as DiscountsService);
  });

  describe('create', () => {
    it('calcula el total con los precios de la base, no con lo que manda el cliente', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Zapatilla A', price: new Prisma.Decimal('1000.50'), isActive: true },
        { id: 2, name: 'Zapatilla B', price: new Prisma.Decimal('250'), isActive: true },
      ]);
      prisma.sale.create.mockResolvedValue(fakeSaleRow());

      await service.create(baseSale, user);

      const { data } = prisma.sale.create.mock.calls[0]![0];
      expect(data.total).toBe(2251);
      expect(data.status).toBe('PENDING');
      expect(data.items.create).toEqual([
        expect.objectContaining({ productName: 'Zapatilla A', unitPrice: 1000.5, quantity: 2, subtotal: 2001 }),
        expect.objectContaining({ productName: 'Zapatilla B', unitPrice: 250, quantity: 1, subtotal: 250 }),
      ]);
      expect(data.history.create).toMatchObject({ status: 'PENDING', createdBy: 'Administrador' });
    });

    it('aplica el cupón sobre el subtotal calculado en la API', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Zapatilla A', price: new Prisma.Decimal('1000'), isActive: true },
        { id: 2, name: 'Zapatilla B', price: new Prisma.Decimal('500'), isActive: true },
      ]);
      discounts.resolveForSale.mockResolvedValue({ id: 3, code: 'BIENVENIDA10', type: 'PERCENTAGE', value: 10 });
      prisma.sale.create.mockResolvedValue(fakeSaleRow());

      await service.create({ ...baseSale, discountCode: 'BIENVENIDA10' }, user);

      expect(discounts.resolveForSale).toHaveBeenCalledWith('BIENVENIDA10', 2500);
      const { data } = prisma.sale.create.mock.calls[0]![0];
      expect(data).toMatchObject({ subtotal: 2500, discountAmount: 250, total: 2250, discountCode: 'BIENVENIDA10' });
    });

    it('si el cupón no sirve no guarda la venta', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Zapatilla A', price: new Prisma.Decimal('100'), isActive: true },
        { id: 2, name: 'Zapatilla B', price: new Prisma.Decimal('100'), isActive: true },
      ]);
      discounts.resolveForSale.mockRejectedValue(new BadRequestException('El cupón VERANO no se puede usar: está vencido'));
      await expect(service.create({ ...baseSale, discountCode: 'VERANO' }, user)).rejects.toThrow(/vencido/);
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });

    it('rechaza productos que no existen', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Zapatilla A', price: new Prisma.Decimal(100), isActive: true },
      ]);
      await expect(service.create(baseSale, user)).rejects.toThrow(BadRequestException);
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });

    it('rechaza productos inactivos', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Zapatilla A', price: new Prisma.Decimal(100), isActive: true },
        { id: 2, name: 'Zapatilla B', price: new Prisma.Decimal(100), isActive: false },
      ]);
      await expect(service.create(baseSale, user)).rejects.toThrow(/inactivos: Zapatilla B/);
    });
  });

  describe('updateStatus', () => {
    it('no permite saltear pasos del flujo', async () => {
      prisma.sale.findUnique.mockResolvedValue({ status: 'PENDING', paymentStatus: 'PAID' });
      await expect(service.updateStatus(10, { status: 'COMPLETED', note: null }, user)).rejects.toThrow(
        'No se puede pasar de "Pendiente" a "Completado"',
      );
      expect(prisma.sale.update).not.toHaveBeenCalled();
    });

    it('permite volver al paso anterior si hubo un error', async () => {
      prisma.sale.findUnique.mockResolvedValue({ status: 'COMPLETED', paymentStatus: 'PAID' });
      prisma.sale.update.mockResolvedValue(fakeSaleRow({ status: 'SHIPPED', paymentStatus: 'PAID' }));
      await service.updateStatus(10, { status: 'SHIPPED', note: null }, user);
      expect(prisma.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SHIPPED' }) }),
      );
    });

    it('reabrir una venta cancelada la deja pendiente y vuelve el pago a cobrado', async () => {
      prisma.sale.findUnique.mockResolvedValue({ status: 'CANCELLED', paymentStatus: 'REFUNDED' });
      prisma.sale.update.mockResolvedValue(fakeSaleRow({ status: 'PENDING', paymentStatus: 'PAID' }));
      await service.updateStatus(10, { status: 'PENDING', note: 'Se canceló por error' }, user);
      expect(prisma.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', paymentStatus: 'PAID' }) }),
      );
    });

    it('una venta cancelada solo se reabre como pendiente', async () => {
      prisma.sale.findUnique.mockResolvedValue({ status: 'CANCELLED', paymentStatus: 'PENDING' });
      await expect(service.updateStatus(10, { status: 'SHIPPED', note: null }, user)).rejects.toThrow(
        'No se puede pasar de "Cancelado" a "Enviado"',
      );
    });

    it('al cancelar una venta cobrada la marca como reembolsada y lo registra en el historial', async () => {
      prisma.sale.findUnique.mockResolvedValue({ status: 'PREPARING', paymentStatus: 'PAID' });
      prisma.sale.update.mockResolvedValue(fakeSaleRow({ status: 'CANCELLED', paymentStatus: 'REFUNDED' }));

      await service.updateStatus(10, { status: 'CANCELLED', note: 'Sin stock en el proveedor' }, user);

      const { data } = prisma.sale.update.mock.calls[0]![0];
      expect(data).toMatchObject({
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        history: { create: { status: 'CANCELLED', note: 'Sin stock en el proveedor', createdBy: 'Administrador' } },
      });
    });
  });
});
