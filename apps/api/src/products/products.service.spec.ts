import { BadRequestException, NotFoundException } from '@nestjs/common';
import { bulkUpdateProductsSchema } from '@admin/shared';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ProductsService } from './products.service.js';

describe('ProductsService (edición masiva)', () => {
  const prisma = {
    product: { findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
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

  it('elimina varios productos', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.product.deleteMany.mockResolvedValue({ count: 2 });
    await expect(service.bulkRemove({ ids: [1, 2] })).resolves.toEqual({ count: 2 });
  });
});
