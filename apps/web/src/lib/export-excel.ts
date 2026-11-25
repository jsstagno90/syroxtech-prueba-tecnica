'use client';

import type { PaginatedResponse } from '@admin/shared';

type CellValue = string | number | boolean | Date | null | undefined;

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => CellValue;
  width?: number;
  /** Formato de Excel, ej. '#,##0.00' para importes o 'dd/mm/yyyy hh:mm' para fechas. */
  format?: string;
}

/**
 * Genera y descarga un .xlsx con las columnas indicadas.
 * La librería se carga recién al exportar, así no pesa en el resto del panel.
 */
export async function exportToExcel<T>(rows: T[], columns: ExportColumn<T>[], options: { fileName: string; sheet: string }) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');

  const header = columns.map((column) => ({
    value: column.header,
    fontWeight: 'bold' as const,
    backgroundColor: '#EEEEEE',
  }));

  const body = rows.map((row) =>
    columns.map((column) => {
      const value = column.value(row);
      if (value === null || value === undefined || value === '') return null;
      return column.format ? { value, format: column.format } : value;
    }),
  );

  await writeXlsxFile([header, ...body], {
    sheet: options.sheet,
    stickyRowsCount: 1,
    columns: columns.map((column) => ({ width: column.width ?? 18 })),
  }).toFile(options.fileName);
}

/** Trae todas las páginas de un listado (respetando filtros y orden), de a 100 registros. Ignora la página del query. */
export async function fetchAllPages<T, Q extends object>(
  list: (query: Q & { page: number; pageSize: number }) => Promise<PaginatedResponse<T>>,
  query: Q,
  maxPages = 50,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, meta } = await list({ ...query, page, pageSize: 100 });
    all.push(...data);
    if (page >= meta.totalPages) break;
  }
  return all;
}

/** "productos-2026-11-25.xlsx" */
export function datedFileName(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}
