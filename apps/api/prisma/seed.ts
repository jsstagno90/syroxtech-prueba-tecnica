/**
 * Datos de ejemplo para la demo: usuario admin, categorías con subcategorías, marcas,
 * productos con variantes, cupones, niveles de membresía y un año de ventas con su historial.
 *
 * Si la base ya tiene datos no hace nada (así se puede correr en cada deploy).
 * Con --reset (pnpm db:reset-demo) o SEED_RESET=true borra todo y vuelve a cargar la demo.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { calculateSaleTotals, type ProductGender } from '@admin/shared';
import { PrismaClient, type PaymentMethod, type PaymentStatus, type SaleStatus } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DEMO_USER = {
  email: process.env.SEED_ADMIN_EMAIL ?? 'admin@demo.com',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'demo1234',
  name: 'Administrador',
};

/** PRNG con semilla: los datos salen iguales en cada corrida. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)]!,
  };
}
const random = createRandom(42);

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=60`;

const CATEGORY_TREE: Record<string, string[]> = {
  Hombre: ['Running', 'Basketball', 'Casual', 'Botas', 'Fútbol'],
  Mujer: ['Running', 'Casual', 'Vestir', 'Sandalias'],
  Niños: ['Escolar', 'Deportivo'],
  Accesorios: ['Medias', 'Mochilas'],
};

const BRANDS = ['Adidas', 'Nike', 'Puma', 'New Balance', 'Vans', 'Topper', 'Converse', 'Reebok'];

type SeedProduct = {
  name: string;
  description: string;
  price: number;
  brand: string;
  category: [parent: string, child: string];
  image?: string;
  isActive?: boolean;
};

const PRODUCTS: SeedProduct[] = [
  { name: 'Zapatillas Nike Air Max 90', description: 'Clásicas con cámara de aire visible y capellada de cuero.', price: 189999, brand: 'Nike', category: ['Hombre', 'Casual'], image: img('photo-1600185365483-26d7a4cc7519') },
  { name: 'Zapatillas Adidas Ultraboost 22', description: 'Running con amortiguación Boost y tejido Primeknit.', price: 214999, brand: 'Adidas', category: ['Hombre', 'Running'], image: img('photo-1491553895911-0055eca6402d') },
  { name: 'Zapatillas Puma Velocity Nitro 3', description: 'Entrenamiento diario con espuma Nitro.', price: 159999, brand: 'Puma', category: ['Hombre', 'Running'], image: img('photo-1608231387042-66d1773070a5') },
  { name: 'Zapatillas Nike Court Vision Low', description: 'Inspiradas en el básquet de los 80.', price: 119999, brand: 'Nike', category: ['Hombre', 'Basketball'], image: img('photo-1600269452121-4f2416e55c28') },
  { name: 'Zapatillas Adidas Dame 8', description: 'Básquet con tracción multidireccional.', price: 174999, brand: 'Adidas', category: ['Hombre', 'Basketball'] },
  { name: 'Botines Puma Future 7 Play', description: 'Botines para césped natural con ajuste FUZIONFIT.', price: 99999, brand: 'Puma', category: ['Hombre', 'Fútbol'] },
  { name: 'Botines Adidas Predator Club', description: 'Control de pelota con superficie texturizada.', price: 109999, brand: 'Adidas', category: ['Hombre', 'Fútbol'] },
  { name: 'Borcegos Topper Trekking', description: 'Cuero gamuzado y suela antideslizante.', price: 89999, brand: 'Topper', category: ['Hombre', 'Botas'] },
  { name: 'Zapatillas Vans Old Skool', description: 'Lona y gamuza con la clásica franja lateral.', price: 94999, brand: 'Vans', category: ['Hombre', 'Casual'], image: img('photo-1525966222134-fcfa99b8ae77') },
  { name: 'Zapatillas Converse Chuck Taylor All Star', description: 'Caña alta de lona, un clásico de siempre.', price: 79999, brand: 'Converse', category: ['Mujer', 'Casual'], image: img('photo-1607522370275-f14206abe5d3') },
  { name: 'Zapatillas Nike Pegasus 41 Mujer', description: 'Running versátil con unidad Air Zoom.', price: 199999, brand: 'Nike', category: ['Mujer', 'Running'], image: img('photo-1595950653106-6c9ebd614d3a') },
  { name: 'Zapatillas New Balance 574', description: 'Ícono retro con suela ENCAP.', price: 139999, brand: 'New Balance', category: ['Mujer', 'Casual'], image: img('photo-1539185441755-769473a23570') },
  { name: 'Zapatillas Reebok Classic Leather', description: 'Cuero suave y diseño atemporal.', price: 99999, brand: 'Reebok', category: ['Mujer', 'Casual'], image: img('photo-1549298916-b41d501d3772') },
  { name: 'Zapatillas Adidas Supernova Mujer', description: 'Comodidad para kilómetros largos.', price: 154999, brand: 'Adidas', category: ['Mujer', 'Running'], image: img('photo-1560769629-975ec94e6a86') },
  { name: 'Sandalias Puma Softride', description: 'Sandalias livianas con plantilla acolchada.', price: 49999, brand: 'Puma', category: ['Mujer', 'Sandalias'] },
  { name: 'Zapatos de vestir estampados Topper', description: 'Taco aguja con estampado floral.', price: 84999, brand: 'Topper', category: ['Mujer', 'Vestir'], isActive: false, image: img('photo-1543163521-1bf539c55dd2') },
  { name: 'Zapatillas Escolares Topper Kids', description: 'Cuero negro, abrojo y suela reforzada.', price: 54999, brand: 'Topper', category: ['Niños', 'Escolar'] },
  { name: 'Zapatillas Nike Revolution 7 Niños', description: 'Livianas y flexibles para todo el día.', price: 69999, brand: 'Nike', category: ['Niños', 'Deportivo'], image: img('photo-1542291026-7eec264c27ff') },
  { name: 'Zapatillas Adidas Tensaur Run Niños', description: 'Cierre de abrojo y suela de goma.', price: 59999, brand: 'Adidas', category: ['Niños', 'Deportivo'] },
  { name: 'Zapatillas Vans Slip-On Kids', description: 'Sin cordones, fáciles de poner.', price: 64999, brand: 'Vans', category: ['Niños', 'Escolar'] },
  { name: 'Pack x3 medias Nike Everyday', description: 'Medias de algodón con soporte en el arco.', price: 19999, brand: 'Nike', category: ['Accesorios', 'Medias'], image: img('photo-1586350977771-b3b0abd50c82') },
  { name: 'Medias Adidas Running', description: 'Media caña con tejido que absorbe la humedad.', price: 12999, brand: 'Adidas', category: ['Accesorios', 'Medias'] },
  { name: 'Mochila Puma Phase', description: 'Mochila de 22 L con bolsillo frontal.', price: 39999, brand: 'Puma', category: ['Accesorios', 'Mochilas'], image: img('photo-1553062407-98eeb64c6a62') },
  { name: 'Mochila Vans Old Skool', description: 'Mochila urbana con logo bordado.', price: 44999, brand: 'Vans', category: ['Accesorios', 'Mochilas'], image: img('photo-1622560480605-d83c853bc5c3') },
];

/** [nombre, correo, peso]: los de más peso compran más seguido (así hay clientes en cada nivel). */
const CUSTOMERS = [
  ['Jaime González', 'jaime.gonzalez@gmail.com', 6],
  ['Santiago Pérez', 'santiago.perez@hotmail.com', 5],
  ['Lucía Fernández', 'lucia.fernandez@gmail.com', 4],
  ['Martina López', 'martina.lopez@yahoo.com', 4],
  ['Tomás Rodríguez', 'tomas.rodriguez@gmail.com', 3],
  ['Valentina Gómez', 'valen.gomez@outlook.com', 3],
  ['Mateo Díaz', 'mateo.diaz@gmail.com', 2],
  ['Camila Sánchez', 'camila.sanchez@gmail.com', 2],
  ['Joaquín Romero', 'joaquin.romero@gmail.com', 1],
  ['Sofía Álvarez', 'sofia.alvarez@hotmail.com', 1],
  ['Benjamín Torres', 'benja.torres@gmail.com', 1],
  ['Emilia Ruiz', 'emilia.ruiz@yahoo.com', 1],
] as const;
const WEIGHTED_CUSTOMERS = CUSTOMERS.flatMap((customer) => Array.from({ length: customer[2] }, () => customer));

const GENDER_BY_PARENT: Record<string, ProductGender> = {
  Hombre: 'MALE',
  Mujer: 'FEMALE',
  Niños: 'KIDS',
  Accesorios: 'UNISEX',
};

/** Talles por público; los productos con variantes de color se listan aparte. */
const SIZES: Record<string, string[]> = {
  Hombre: ['39', '40', '41', '42', '43', '44'],
  Mujer: ['35', '36', '37', '38', '39', '40'],
  Niños: ['28', '29', '30', '31', '32', '33'],
  Medias: ['S', 'M', 'L'],
};
const COLORS: Record<string, string[]> = {
  'Zapatillas Nike Air Max 90': ['Blanco', 'Negro'],
  'Zapatillas Vans Old Skool': ['Negro', 'Azul'],
  'Zapatillas Converse Chuck Taylor All Star': ['Negro', 'Blanco', 'Rojo'],
};
/** Fotos extra para mostrar la galería en algunos productos. */
const EXTRA_IMAGES: Record<string, string[]> = {
  'Zapatillas Nike Air Max 90': [img('photo-1542291026-7eec264c27ff'), img('photo-1600269452121-4f2416e55c28')],
  'Zapatillas Vans Old Skool': [img('photo-1607522370275-f14206abe5d3')],
};

const DISCOUNTS = [
  { code: 'BIENVENIDA10', description: 'Primera compra', type: 'PERCENTAGE', value: 10 },
  { code: 'ENVIO5000', description: '$5.000 menos en compras desde $80.000', type: 'FIXED', value: 5000, minPurchase: 80000 },
  { code: 'VIP15', description: 'Clientes frecuentes (3 usos)', type: 'PERCENTAGE', value: 15, usageLimit: 3 },
  { code: 'CYBER25', description: 'Cyber Monday', type: 'PERCENTAGE', value: 25, daysFrom: -45, daysTo: -40 },
  { code: 'BLACKFRIDAY', description: 'Black Friday', type: 'PERCENTAGE', value: 20, daysFrom: 3, daysTo: 5 },
] as const;

const TIERS = [
  { name: 'Bronce', minSpent: 0, pointsMultiplier: 1, color: 'amber', benefits: 'Suma 1 punto cada $1.000 de compra.' },
  { name: 'Plata', minSpent: 5_000_000, pointsMultiplier: 1.25, color: 'zinc', benefits: 'Puntos x1,25 y envío gratis en compras desde $100.000.' },
  { name: 'Oro', minSpent: 10_000_000, pointsMultiplier: 1.5, color: 'yellow', benefits: 'Puntos x1,5, envío gratis siempre y acceso anticipado a lanzamientos.' },
] as const;

const ADDRESSES = [
  'Av. Alem 1250, Bahía Blanca, Buenos Aires',
  'Belgrano 845, Rosario, Santa Fe',
  'Av. Corrientes 3200, CABA',
  'San Martín 410, Mendoza',
  'Colón 1520, Córdoba',
];

/** Recorrido de estados según dónde terminó la venta. */
const STATUS_PATHS: Record<SaleStatus, SaleStatus[]> = {
  PENDING: ['PENDING'],
  PREPARING: ['PENDING', 'PREPARING'],
  SHIPPED: ['PENDING', 'PREPARING', 'SHIPPED'],
  COMPLETED: ['PENDING', 'PREPARING', 'SHIPPED', 'COMPLETED'],
  CANCELLED: ['PENDING', 'CANCELLED'],
};

const STATUS_NOTES: Partial<Record<SaleStatus, string>> = {
  PENDING: 'Venta generada desde el panel',
  PREPARING: 'Pedido en preparación en el depósito',
  SHIPPED: 'Despachado por Andreani',
  COMPLETED: 'Entregado al cliente',
  CANCELLED: 'Cancelado a pedido del cliente',
};

async function main() {
  const alreadySeeded = (await prisma.user.count()) > 0;
  const reset = process.argv.includes('--reset') || process.env.SEED_RESET === 'true';
  if (alreadySeeded && !reset) {
    console.log('ℹ️  La base ya tiene datos: no se modifica. Para recargar la demo: pnpm db:reset-demo');
    return;
  }

  console.log('🌱 Cargando datos de ejemplo...');

  await prisma.$transaction([
    prisma.saleStatusHistory.deleteMany(),
    prisma.discount.deleteMany(),
    prisma.membershipTier.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany({ where: { parentId: { not: null } } }),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await prisma.user.create({
    data: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      passwordHash: await bcrypt.hash(DEMO_USER.password, 10),
    },
  });

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, storeName: 'Tennis Star' },
    update: {},
  });
  await prisma.storeSettings.update({
    where: { id: 1 },
    data: {
      storeName: 'Tennis Star',
      contactEmail: 'hola@tennisstar.com.ar',
      contactPhone: '291 455-1200',
      address: 'Av. Alem 1250, Bahía Blanca',
      loyaltyEnabled: true,
      amountPerPoint: 1000,
    },
  });
  await prisma.membershipTier.createMany({ data: TIERS.map((tier) => ({ ...tier })) });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const discountIds = new Map<string, number>();
  for (const discount of DISCOUNTS) {
    const { daysFrom, daysTo, ...data } = { daysFrom: undefined, daysTo: undefined, ...discount } as typeof discount & {
      daysFrom?: number;
      daysTo?: number;
    };
    const created = await prisma.discount.create({
      data: {
        ...data,
        startsAt: daysFrom === undefined ? null : new Date(Date.now() + daysFrom * DAY_MS),
        endsAt: daysTo === undefined ? null : new Date(Date.now() + daysTo * DAY_MS),
      },
    });
    discountIds.set(discount.code, created.id);
  }

  const categoryIds = new Map<string, number>();
  let parentPosition = 0;
  for (const [parentName, children] of Object.entries(CATEGORY_TREE)) {
    const parent = await prisma.category.create({ data: { name: parentName, position: parentPosition++ } });
    categoryIds.set(parentName, parent.id);
    for (const [index, childName] of children.entries()) {
      const child = await prisma.category.create({
        data: { name: childName, position: index, parentId: parent.id },
      });
      categoryIds.set(`${parentName}/${childName}`, child.id);
    }
  }

  const brandIds = new Map<string, number>();
  for (const name of BRANDS) {
    const brand = await prisma.brand.create({ data: { name } });
    brandIds.set(name, brand.id);
  }

  const products = [];
  let variantsCount = 0;
  for (const [index, product] of PRODUCTS.entries()) {
    const sku = `SKU-${String(index + 1).padStart(4, '0')}`;
    const [parent, child] = product.category;
    const sizes = SIZES[child] ?? (parent === 'Accesorios' ? undefined : SIZES[parent]);
    const colors = COLORS[product.name];
    const options = [
      ...(sizes ? [{ name: 'Talla', values: sizes }] : []),
      ...(colors ? [{ name: 'Color', values: colors }] : []),
    ];
    const combos = options.reduce<Record<string, string>[]>(
      (acc, option) => acc.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name]: value }))),
      [{}],
    );
    const variants = options.length
      ? combos.map((combo, position) => ({
          options: combo,
          sku: `${sku}-${Object.values(combo).map((value) => value.slice(0, 3).toUpperCase()).join('-')}`,
          // El talle más grande de adultos sale un poco más caro, para mostrar precios por variante.
          price: combo.Talla === '44' ? product.price + 10000 : null,
          isActive: !(combo.Talla === '35' && index % 2 === 0),
          position,
        }))
      : [];
    variantsCount += variants.length;
    const images = product.image ? [product.image, ...(EXTRA_IMAGES[product.name] ?? [])] : [];

    products.push(
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          sku,
          imageUrl: images[0] ?? null,
          images,
          gender: GENDER_BY_PARENT[parent] ?? null,
          options,
          variants: { create: variants },
          isActive: product.isActive ?? true,
          categoryId: categoryIds.get(product.category.join('/'))!,
          brandId: brandIds.get(product.brand)!,
        },
      }),
    );
  }

  const activeProducts = products.filter((product) => product.isActive);
  const finalStatuses: SaleStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'SHIPPED', 'SHIPPED', 'PREPARING', 'PENDING', 'CANCELLED'];
  const methods: PaymentMethod[] = ['CARD', 'CARD', 'TRANSFER', 'CASH'];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Un año de ventas: entre 0 y 3 por día el último mes (el gráfico del inicio) y menos antes (estadísticas).
  const salesPerDay = [0, 1, 1, 2, 2, 3] as const;
  const olderSalesPerDay = [0, 0, 1, 1, 2] as const;
  const discountUses = new Map<string, number>();
  let salesCount = 0;
  for (let daysAgo = 364; daysAgo >= 0; daysAgo--) {
    // La tienda crece: los meses viejos tienen algo menos de movimiento que los recientes.
    const count = daysAgo < 30 ? random.pick(salesPerDay) : daysAgo > 240 && random.next() < 0.35 ? 0 : random.pick(olderSalesPerDay);
    for (let n = 0; n < count; n++) {
      const i = salesCount++;
      const status = daysAgo < 2 ? random.pick(['PENDING', 'PREPARING'] as const) : random.pick(finalStatuses);
      const [customerName, customerEmail] = random.pick(WEIGHTED_CUSTOMERS);
      const createdAt = new Date(now - daysAgo * DAY - random.int(1, 10) * 60 * 60 * 1000);
      const chosen = new Set<(typeof activeProducts)[number]>();
      const linesCount = random.int(1, 3);
      while (chosen.size < linesCount) chosen.add(random.pick(activeProducts));

      const saleLines = [...chosen].map((product) => ({ product, unitPrice: product.price.toNumber(), quantity: random.int(1, 2) }));
      // Algunas ventas recientes usan un cupón vigente (respetando mínimo y límite de usos).
      const subtotalBefore = calculateSaleTotals(saleLines).subtotal;
      let coupon: (typeof DISCOUNTS)[number] | null = null;
      if (daysAgo < 60 && random.next() < 0.25) {
        const candidate = random.pick(DISCOUNTS.slice(0, 3));
        const used = discountUses.get(candidate.code) ?? 0;
        const minOk = !('minPurchase' in candidate) || subtotalBefore >= candidate.minPurchase;
        const limitOk = !('usageLimit' in candidate) || used < candidate.usageLimit;
        if (minOk && limitOk && status !== 'CANCELLED') {
          coupon = candidate;
          discountUses.set(candidate.code, used + 1);
        }
      }
      const { lines, subtotal, discountAmount, total } = calculateSaleTotals(saleLines, coupon);

      let paymentStatus: PaymentStatus = 'PAID';
      if (status === 'PENDING') paymentStatus = random.pick(['PENDING', 'PAID'] as const);
      if (status === 'CANCELLED') paymentStatus = random.pick(['FAILED', 'REFUNDED'] as const);

      const path = STATUS_PATHS[status];
      await prisma.sale.create({
        data: {
          orderNumber: (0x10000000 + i * 7919 * 4093).toString(16).toUpperCase().slice(-8),
          customerName,
          customerEmail,
          customerPhone: `291 4${String(100000 + CUSTOMERS.findIndex((c) => c[1] === customerEmail) * 73421).slice(0, 6)}`,
          shippingAddress: random.pick(ADDRESSES),
          trackingNumber: status === 'SHIPPED' || status === 'COMPLETED' ? `AND${random.int(100000000, 999999999)}` : null,
          paymentMethod: random.pick(methods),
          paymentStatus,
          status,
          subtotal,
          discountAmount,
          total,
          ...(coupon && { discountId: discountIds.get(coupon.code)!, discountCode: coupon.code }),
          createdAt,
          items: {
            create: lines.map((line) => ({
              productId: line.product.id,
              productName: line.product.name,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              subtotal: line.subtotal,
            })),
          },
          history: {
            create: path.map((step, index) => ({
              status: step,
              note: STATUS_NOTES[step] ?? null,
              createdBy: DEMO_USER.name,
              createdAt: new Date(Math.min(createdAt.getTime() + index * (DAY / 2), now)),
            })),
          },
        },
      });
    }
  }

  console.log(
    `✅ Listo: ${categoryIds.size} categorías, ${BRANDS.length} marcas, ${products.length} productos (${variantsCount} variantes), ` +
      `${DISCOUNTS.length} cupones, ${TIERS.length} niveles y ${salesCount} ventas.`,
  );
  console.log(`   Usuario demo: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
