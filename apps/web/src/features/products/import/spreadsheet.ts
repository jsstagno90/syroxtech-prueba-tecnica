'use client';

import { PRODUCT_IMPORT_FIELDS, type ProductImportField, type ProductImportRow } from '@admin/shared';

export type CellValue = string | number | boolean | null;

export interface ParsedSpreadsheet {
  fileName: string;
  headers: string[];
  /** Filas de datos (sin el encabezado ni las filas vacías). */
  rows: CellValue[][];
  /** Número de fila real en el archivo de cada fila de `rows` (para los mensajes de error). */
  rowNumbers: number[];
}

export type ColumnMapping = Record<ProductImportField, number | null>;

const MAX_ROWS = 1000;

function normalizeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

/**
 * Lee un .xlsx o .csv en el navegador. La primera fila con datos se toma como encabezado.
 * Las librerías se cargan recién al usarlas, así no pesan en el resto del panel.
 */
export async function readSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let raw: unknown[][];

  if (extension === 'csv') {
    const { default: Papa } = await import('papaparse');
    raw = await new Promise((resolve, reject) =>
      Papa.parse<unknown[]>(file, {
        skipEmptyLines: 'greedy',
        complete: (result) => resolve(result.data),
        error: reject,
      }),
    );
  } else if (extension === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    raw = await readSheet(file);
  } else {
    throw new Error('Formato no soportado: subí un archivo .xlsx o .csv');
  }

  const rows = raw.map((row) => row.map(normalizeCell));
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell !== null));
  if (headerIndex === -1) throw new Error('El archivo está vacío');

  const headerRow = rows[headerIndex]!;
  const headers = headerRow.map((cell, index) => (cell === null ? `Columna ${columnLetter(index)}` : String(cell)));

  const data: CellValue[][] = [];
  const rowNumbers: number[] = [];
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    if (row.every((cell) => cell === null)) return;
    data.push(row);
    rowNumbers.push(headerIndex + offset + 2); // +1 por el encabezado, +1 porque Excel cuenta desde 1
  });

  if (!data.length) throw new Error('El archivo tiene encabezados pero ninguna fila de datos');
  if (data.length > MAX_ROWS) throw new Error(`El archivo tiene ${data.length} filas: el máximo es ${MAX_ROWS} por importación`);

  return { fileName: file.name, headers, rows: data, rowNumbers };
}

/** Arma las filas que se mandan a la API según qué columna eligió el usuario para cada campo. */
export function applyMapping(sheet: ParsedSpreadsheet, mapping: ColumnMapping): ProductImportRow[] {
  return sheet.rows.map((row, index) => {
    const mapped: ProductImportRow = { rowNumber: sheet.rowNumbers[index]! };
    for (const field of PRODUCT_IMPORT_FIELDS) {
      const column = mapping[field.key];
      if (column !== null) mapped[field.key] = row[column] ?? null;
    }
    return mapped;
  });
}

/** Primer valor no vacío de una columna, para mostrar de ejemplo en el mapeo. */
export function sampleValue(sheet: ParsedSpreadsheet, column: number | null) {
  if (column === null) return null;
  return sheet.rows.find((row) => row[column] !== null && row[column] !== undefined)?.[column] ?? null;
}

/** 0 → A, 1 → B, 26 → AA */
export function columnLetter(index: number): string {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/** Plantilla .xlsx con los encabezados, dos ejemplos y hojas de referencia con categorías y marcas válidas. */
export async function downloadTemplate(categoryPaths: string[], brandNames: string[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = (value: string) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#EEEEEE' });
  const leafExample = categoryPaths.find((path) => path.includes('>')) ?? categoryPaths[0] ?? 'Hombre > Running';

  await writeXlsxFile([
    {
      sheet: 'Productos',
      stickyRowsCount: 1,
      columns: [{ width: 34 }, { width: 12 }, { width: 26 }, { width: 14 }, { width: 40 }, { width: 16 }, { width: 40 }, { width: 10 }],
      data: [
        PRODUCT_IMPORT_FIELDS.map((field) => header(field.required ? `${field.label} *` : field.label)),
        ['Zapatillas de ejemplo', 129999, leafExample, 'SKU-EJ-01', 'Descripción opcional', brandNames[0] ?? '', '', 'Sí'],
        ['Otro producto de ejemplo', 54999.5, leafExample, 'SKU-EJ-02', '', '', '', 'No'],
      ],
    },
    {
      sheet: 'Categorías válidas',
      columns: [{ width: 40 }],
      data: [[header('Categoría (copiá el texto tal cual)')], ...categoryPaths.map((path) => [path])],
    },
    {
      sheet: 'Marcas',
      columns: [{ width: 30 }],
      data: [[header('Marca')], ...brandNames.map((name) => [name])],
    },
  ]).toFile('plantilla-productos.xlsx');
}
