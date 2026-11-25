import type { CategoryOption, CategoryResponse, CreateCategoryDto, UpdateCategoryDto } from '@admin/shared';
import { createResourceApi } from '@/lib/api/resource';
import { createResourceHooks } from '@/lib/api/resource-hooks';
import type { ListParams } from '@/lib/api/types';

export type CategorySortKey = 'name' | 'position' | 'createdAt';

export interface CategoryFilters {
  parentId?: number;
  rootOnly?: boolean;
}

export const categoriesApi = createResourceApi<
  CategoryResponse,
  CreateCategoryDto,
  UpdateCategoryDto,
  ListParams<CategorySortKey> & CategoryFilters,
  CategoryOption
>('categories');

export const categoryHooks = createResourceHooks(categoriesApi, {
  key: 'categories',
  invalidates: ['products', 'dashboard'],
  messages: {
    created: 'Categoría creada',
    updated: 'Categoría actualizada',
    deleted: 'Categoría eliminada',
  },
});

/** "Hombre › Running": nombre completo de cada categoría para mostrar en selects. */
export function buildCategoryPaths(options: CategoryOption[]) {
  const byId = new Map(options.map((option) => [option.id, option]));
  const pathOf = (option: CategoryOption, depth = 0): string => {
    const parent = option.parentId ? byId.get(option.parentId) : undefined;
    return parent && depth < 10 ? `${pathOf(parent, depth + 1)} › ${option.name}` : option.name;
  };
  return options
    .map((option) => ({ ...option, path: pathOf(option) }))
    .sort((a, b) => a.path.localeCompare(b.path, 'es'));
}

/** Ids de una categoría y todas sus subcategorías (no pueden ser su propio padre). */
export function collectDescendantIds(options: CategoryOption[], rootId: number) {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const option of options) {
      if (option.parentId !== null && ids.has(option.parentId) && !ids.has(option.id)) {
        ids.add(option.id);
        added = true;
      }
    }
  }
  return ids;
}
