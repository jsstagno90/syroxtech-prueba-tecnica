import {
  buildVariantCombinations,
  calculateDiscountAmount,
  calculatePoints,
  calculateSaleTotals,
  createProductSchema,
  getDiscountStatus,
  resolveTier,
} from '@admin/shared';

/** Reglas compartidas entre la API y el panel (viven en @admin/shared). */
describe('reglas de negocio', () => {
  describe('cupones', () => {
    const base = { isActive: true, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0 };

    it('calcula el estado según fechas, usos y si está pausado', () => {
      const today = '2026-11-25';
      expect(getDiscountStatus(base, today)).toBe('ACTIVE');
      expect(getDiscountStatus({ ...base, isActive: false }, today)).toBe('INACTIVE');
      expect(getDiscountStatus({ ...base, endsAt: '2026-11-24' }, today)).toBe('EXPIRED');
      expect(getDiscountStatus({ ...base, endsAt: '2026-11-25' }, today)).toBe('ACTIVE');
      expect(getDiscountStatus({ ...base, startsAt: '2026-11-28' }, today)).toBe('SCHEDULED');
      expect(getDiscountStatus({ ...base, usageLimit: 3, usedCount: 3 }, today)).toBe('EXHAUSTED');
    });

    it('un monto fijo nunca deja el total en negativo', () => {
      expect(calculateDiscountAmount(3000, { type: 'FIXED', value: 5000 })).toBe(3000);
      expect(calculateDiscountAmount(99999, { type: 'PERCENTAGE', value: 15 })).toBe(14999.85);
    });

    it('el total de la venta descuenta el cupón sobre el subtotal', () => {
      const totals = calculateSaleTotals([{ unitPrice: 1000, quantity: 3 }], { type: 'PERCENTAGE', value: 10 });
      expect(totals).toMatchObject({ subtotal: 3000, discountAmount: 300, total: 2700 });
    });
  });

  describe('membresías y puntos', () => {
    const tiers = [
      { id: 1, minSpent: 0 },
      { id: 2, minSpent: 500_000 },
      { id: 3, minSpent: 1_000_000 },
    ];

    it('ubica al cliente en el nivel más alto que alcanzó', () => {
      expect(resolveTier(0, tiers)?.id).toBe(1);
      expect(resolveTier(499_999, tiers)?.id).toBe(1);
      expect(resolveTier(500_000, tiers)?.id).toBe(2);
      expect(resolveTier(5_000_000, tiers)?.id).toBe(3);
      expect(resolveTier(100, [])).toBeNull();
    });

    it('suma 1 punto por cada monto gastado, multiplicado por el nivel', () => {
      expect(calculatePoints(10_500, 1000)).toBe(10);
      expect(calculatePoints(10_500, 1000, 1.5)).toBe(15);
    });
  });

  describe('variantes', () => {
    it('genera todas las combinaciones de las opciones', () => {
      const combos = buildVariantCombinations([
        { name: 'Talla', values: ['38', '39'] },
        { name: 'Color', values: ['Negro', 'Blanco', 'Rojo'] },
      ]);
      expect(combos).toHaveLength(6);
      expect(combos[0]).toEqual({ Talla: '38', Color: 'Negro' });
    });

    it('rechaza valores repetidos y variantes que no coinciden con las opciones', () => {
      const result = createProductSchema.safeParse({
        name: 'Zapatilla',
        price: 1000,
        categoryId: 1,
        options: [{ name: 'Talla', values: ['40', '40'] }],
        variants: [{ options: { Talla: '41' }, sku: null, price: null, isActive: true }],
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining(['"40" está repetido', 'La variante no coincide con las opciones']),
      );
    });

    it('no deja repetir un SKU entre variantes', () => {
      const result = createProductSchema.safeParse({
        name: 'Zapatilla',
        price: 1000,
        categoryId: 1,
        options: [{ name: 'Talla', values: ['40', '41'] }],
        variants: [
          { options: { Talla: '40' }, sku: 'Z-1', price: null, isActive: true },
          { options: { Talla: '41' }, sku: 'z-1', price: null, isActive: true },
        ],
      });
      expect(result.error?.issues[0]).toMatchObject({ path: ['variants', 1, 'sku'], message: 'SKU repetido' });
    });
  });
});
