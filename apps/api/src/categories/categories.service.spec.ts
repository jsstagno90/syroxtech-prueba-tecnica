import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CategoriesService } from './categories.service.js';

function categoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Hombre',
    position: 0,
    parentId: null,
    parent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { children: 0, products: 0 },
    ...overrides,
  };
}

describe('CategoriesService', () => {
  const prisma = {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  const service = new CategoriesService(prisma as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  describe('remove', () => {
    it('no deja borrar una categoría con subcategorías', async () => {
      prisma.category.findUnique.mockResolvedValue(categoryRow({ _count: { children: 3, products: 0 } }));
      await expect(service.remove(1)).rejects.toThrow(ConflictException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('no deja borrar una categoría con productos', async () => {
      prisma.category.findUnique.mockResolvedValue(categoryRow({ _count: { children: 0, products: 5 } }));
      await expect(service.remove(1)).rejects.toThrow(/5 producto/);
    });

    it('borra una categoría vacía', async () => {
      prisma.category.findUnique.mockResolvedValue(categoryRow());
      await service.remove(1);
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('update', () => {
    it('evita ciclos: "Hombre" no puede pasar a colgar de su propia subcategoría', async () => {
      // Hombre (1) -> Running (2). Intentamos poner a Hombre debajo de Running.
      prisma.category.findUnique.mockImplementation(({ where }: { where: { id: number } }) => {
        if (where.id === 1) return Promise.resolve(categoryRow());
        if (where.id === 2) return Promise.resolve({ parentId: 1 });
        return Promise.resolve(null);
      });
      prisma.category.count.mockResolvedValue(1);

      await expect(service.update(1, { parentId: 2 })).rejects.toThrow(BadRequestException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('rechaza nombres repetidos en el mismo nivel', async () => {
      prisma.category.findUnique.mockResolvedValue(categoryRow({ id: 5, name: 'Running', parentId: 1 }));
      prisma.category.findFirst.mockResolvedValue({ id: 6 });

      await expect(service.update(5, { name: 'Casual' })).rejects.toThrow('Ya existe una categoría "Casual"');
    });
  });
});
