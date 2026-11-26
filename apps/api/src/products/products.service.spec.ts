import { BadRequestException, NotFoundException } from '@nestjs/common';
import { applyPriceChange, bulkPriceChangeSchema, bulkUpdateProductsSchema } from '@admin/shared';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ProductsService } from './products.service.js';

describe('ProductsService (edición masiva)', () => {
  const prisma = {
    product: { findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
    productVariant: { update: vi.fn() },
    $transaction: vi.fn(),
    category: { count: vi.fn() },
    brand: { count: vi.fn() },
  };
  const service = new ProductsService(prisma as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  it('cambia la categoría de todos los productos elegidos', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    prisma.category.count.mockResolvedValue(1);
    prisma.product.updateMany.mockResolvedValue({ count: 3 });

    await expect(service.bulkUpdate({ ids: [1, 2, 3], data: { categoryId: 7 } })).resolves.toEqual({ count: 3 });
    expect(prisma.product.updateMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2, 3] } }, data: { categoryId: 7 } });
  });

  it('no toca ninguno si alguno ya no existe', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(service.bulkUpdate({ ids: [1, 2], data: { isActive: false } })).rejects.toThrow(
      new NotFoundException('El producto 2 ya no existe'),
    );
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('valida que la categoría exista', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.category.count.mockResolvedValue(0);
    await expect(service.bulkUpdate({ ids: [1], data: { categoryId: 99 } })).rejects.toThrow(BadRequestException);
  });

  it('el schema exige al menos un cambio y descarta ids repetidos', () => {
    expect(bulkUpdateProductsSchema.safeParse({ ids: [1], data: {} }).success).toBe(false);
    expect(bulkUpdateProductsSchema.parse({ ids: [4, 4, 5], data: { brandId: null } }).ids).toEqual([4, 5]);
  });

  describe('cambio de precio en %', () => {
    it('sube, redondea y nunca deja un precio en 0', () => {
      expect(applyPriceChange(89999, 10, 1)).toBe(98999);
      expect(applyPriceChange(89999, 10, 0.01)).toBe(98998.9);
      expect(applyPriceChange(89999, 10, 100)).toBe(99000);
      expect(applyPriceChange(120000, -15, 1)).toBe(102000);
      expect(applyPriceChange(40, -90, 100)).toBe(100);
    });

    it('el schema pide un porcentaje distinto de 0 y dentro del rango', () => {
      expect(bulkPriceChangeSchema.safeParse({ ids: [1], percent: 0 }).success).toBe(false);
      expect(bulkPriceChangeSchema.safeParse({ ids: [1], percent: -95 }).success).toBe(false);
      expect(bulkPriceChangeSchema.parse({ ids: [1], percent: 12.5 }).roundTo).toBe(1);
    });

    it('ajusta los productos y las variantes con precio propio', async () => {
      prisma.product.findMany
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([
          { id: 1, price: new Prisma.Decimal('100000'), variants: [{ id: 10, price: new Prisma.Decimal('110000') }] },
          { id: 2, price: new Prisma.Decimal('50000'), variants: [] },
        ]);
      prisma.product.update.mockImplementation((args) => args);
      prisma.productVariant.update.mockImplementation((args) => args);

      await expect(service.bulkChangePrice({ ids: [1, 2], percent: 10, roundTo: 1 })).resolves.toEqual({
        count: 2,
        variants: 1,
      });
      expect(prisma.$transaction).toHaveBeenCalledWith([
        { where: { id: 1 }, data: { price: 110000 } },
        { where: { id: 2 }, data: { price: 55000 } },
        { where: { id: 10 }, data: { price: 121000 } },
      ]);
    });
  });

  it('elimina varios productos', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.product.deleteMany.mockResolvedValue({ count: 2 });
    await expect(service.bulkRemove({ ids: [1, 2] })).resolves.toEqual({ count: 2 });
  });
});
