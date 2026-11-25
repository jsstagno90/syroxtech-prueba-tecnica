import { normalizeText } from '@admin/shared';

type Cell = string | number | boolean | null | undefined;

/** Texto limpio de una celda (o string vacío). */
export function cellText(value: Cell): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Interpreta precios como los escribe la gente: 150000, "150.000,50", "$ 1.500", "1,5", "1500.75".
 * Devuelve `null` si no es un número.
 */
export function parsePrice(value: Cell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let text = cellText(value).replace(/\s|\$|ars|usd|u\$s/gi, '');
  if (!text) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // El separador que aparece último es el decimal.
    text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (lastComma !== -1) {
    text = text.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    // "150.000" con punto de miles (formato argentino).
    text = text.replace(/\./g, '');
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

const TRUE_VALUES = new Set(['si', 's', 'yes', 'y', 'true', '1', 'activo', 'activa', 'x', 'publicado', 'habilitado']);
const FALSE_VALUES = new Set(['no', 'n', 'false', '0', 'inactivo', 'inactiva', 'pausado', 'deshabilitado']);

/** Celda vacía = activo. Devuelve `null` si el valor no se entiende. */
export function parseActive(value: Cell): boolean | null {
  if (typeof value === 'boolean') return value;
  const text = normalizeText(cellText(value));
  if (!text) return true;
  if (TRUE_VALUES.has(text)) return true;
  if (FALSE_VALUES.has(text)) return false;
  return null;
}

/** Parecido entre dos textos (0 a 1), comparando pares de letras. Sirve para sugerir "quisiste decir...". */
export function similarity(a: string, b: string): number {
  const x = normalizeText(a).replace(/ /g, '');
  const y = normalizeText(b).replace(/ /g, '');
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;
  const pairs = (text: string) => new Set(Array.from({ length: text.length - 1 }, (_, i) => text.slice(i, i + 2)));
  const px = pairs(x);
  const py = pairs(y);
  const shared = [...px].filter((pair) => py.has(pair)).length;
  return px.size + py.size === 0 ? 0 : (2 * shared) / (px.size + py.size);
}

/** Las opciones más parecidas al texto ingresado (como máximo `limit`). */
export function closestMatches(input: string, options: string[], limit = 3, minScore = 0.45): string[] {
  return options
    .map((option) => {
      const lastPart = option.split(' > ').pop() ?? option;
      return { option, score: Math.max(similarity(input, option), similarity(input, lastPart)) };
    })
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((match) => match.option);
}

interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
}

export type CategoryResolution = { id: number } | { error: string; suggestions: string[] };

/**
 * Busca categorías por nombre ("Running") o por ruta ("Hombre > Running", "Hombre › Running", "Hombre/Running").
 * Si no la encuentra o es ambigua, sugiere las rutas posibles para corregirla.
 */
export function createCategoryResolver(categories: CategoryNode[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const pathOf = (category: CategoryNode): string[] => {
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    return parent ? [...pathOf(parent), category.name] : [category.name];
  };
  const keyOf = (parts: string[]) => parts.map(normalizeText).filter(Boolean).join('>');

  const byPath = new Map<string, CategoryNode>();
  const byName = new Map<string, CategoryNode[]>();
  const allPaths: string[] = [];
  for (const category of categories) {
    const path = pathOf(category);
    byPath.set(keyOf(path), category);
    allPaths.push(path.join(' > '));
    const nameKey = normalizeText(category.name);
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), category]);
  }

  return (input: string): CategoryResolution => {
    if (!input) return { error: 'Falta la categoría', suggestions: [] };

    const exact = byPath.get(keyOf(input.split(/›|>|\/|\\/)));
    if (exact) return { id: exact.id };

    const matches = byName.get(normalizeText(input)) ?? [];
    if (matches.length === 1) return { id: matches[0]!.id };
    if (matches.length > 1) {
      const paths = matches.map((category) => pathOf(category).join(' > '));
      return { error: `"${input}" existe en varios lugares: elegí cuál`, suggestions: paths };
    }
    return { error: `La categoría "${input}" no existe`, suggestions: closestMatches(input, allPaths) };
  };
}
