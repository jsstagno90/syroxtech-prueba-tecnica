import type { Prisma } from '../../generated/prisma/client.js';

/** Prisma devuelve los DECIMAL como objetos: el panel trabaja con number. */
export const toNumber = (value: Prisma.Decimal | number): number =>
  typeof value === 'number' ? value : value.toNumber();
