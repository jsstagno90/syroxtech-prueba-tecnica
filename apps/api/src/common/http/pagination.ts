import type { PaginatedResponse } from '@admin/shared';

interface PageQuery {
  page: number;
  pageSize: number;
}

/** Convierte page/pageSize en el skip/take que entiende Prisma. */
export function toPrismaPage({ page, pageSize }: PageQuery) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** Arma la respuesta paginada estándar que consumen todas las tablas del panel. */
export function paginate<T>(data: T[], total: number, { page, pageSize }: PageQuery): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
