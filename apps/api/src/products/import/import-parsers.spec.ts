import { guessColumnMapping } from '@admin/shared';
import { closestMatches, createCategoryResolver, parseActive, parsePrice } from './import-parsers.js';

describe('parsePrice', () => {
  it.each([
    [150000, 150000],
    ['150000', 150000],
    ['150.000', 150000],
    ['150.000,50', 150000.5],
    ['$ 1.500', 1500],
    ['1,5', 1.5],
    ['1500.75', 1500.75],
    ['1,234.56', 1234.56],
    ['ARS 2.000', 2000],
  ])('%j → %d', (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });

  it('devuelve null si no es un número', () => {
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(null)).toBeNull();
  });
});

describe('parseActive', () => {
  it('entiende sí/no en varias formas y toma la celda vacía como activo', () => {
    expect(parseActive('Sí')).toBe(true);
    expect(parseActive('x')).toBe(true);
    expect(parseActive('')).toBe(true);
    expect(parseActive('Inactivo')).toBe(false);
    expect(parseActive(0)).toBe(false);
    expect(parseActive('quizás')).toBeNull();
  });
});

describe('createCategoryResolver', () => {
  const resolve = createCategoryResolver([
    { id: 1, name: 'Hombre', parentId: null },
    { id: 2, name: 'Running', parentId: 1 },
    { id: 3, name: 'Mujer', parentId: null },
    { id: 4, name: 'Running', parentId: 3 },
    { id: 5, name: 'Fútbol', parentId: 1 },
  ]);

  it('encuentra por ruta con distintos separadores', () => {
    expect(resolve('Hombre > Running')).toEqual({ id: 2 });
    expect(resolve('mujer/running')).toEqual({ id: 4 });
    expect(resolve('Hombre › Running')).toEqual({ id: 2 });
  });

  it('encuentra por nombre si es único, sin importar tildes ni mayúsculas', () => {
    expect(resolve('FUTBOL')).toEqual({ id: 5 });
  });

  it('si el nombre existe en varios lugares, sugiere las rutas posibles', () => {
    expect(resolve('Running')).toEqual({
      error: expect.stringContaining('varios lugares'),
      suggestions: ['Hombre > Running', 'Mujer > Running'],
    });
  });

  it('si no existe, sugiere las más parecidas', () => {
    expect(resolve('Runing')).toMatchObject({ error: 'La categoría "Runing" no existe' });
    const result = resolve('Runing') as { suggestions: string[] };
    expect(result.suggestions).toContain('Hombre > Running');
    expect(resolve('Futbol 5')).toMatchObject({ suggestions: ['Hombre > Fútbol'] });
  });
});

describe('guessColumnMapping', () => {
  it('reconoce encabezados en cualquier orden y con otros nombres', () => {
    const mapping = guessColumnMapping(['Código', 'Artículo', 'Rubro', 'Valor', 'Columna que no se usa']);
    expect(mapping).toMatchObject({ sku: 0, name: 1, category: 2, price: 3, brand: null });
  });
});

describe('closestMatches', () => {
  it('sugiere marcas parecidas aunque estén mal escritas', () => {
    expect(closestMatches('Adiddas', ['Adidas', 'Nike', 'Puma'])).toEqual(['Adidas']);
    expect(closestMatches('xyz', ['Adidas', 'Nike'])).toEqual([]);
  });
});
