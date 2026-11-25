import { FolderTree, Home, Package, ShoppingCart, Tag, type LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Menú lateral. Sumar una sección nueva es agregar una línea acá. */
export const navigation: NavGroup[] = [
  {
    label: 'General',
    items: [
      { title: 'Inicio', href: '/', icon: Home },
      { title: 'Ventas', href: '/ventas', icon: ShoppingCart },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { title: 'Productos', href: '/productos', icon: Package },
      { title: 'Categorías', href: '/categorias', icon: FolderTree },
      { title: 'Marcas', href: '/marcas', icon: Tag },
    ],
  },
];

/** Nombres para las migas de pan de rutas que no están en el menú. */
export const breadcrumbLabels: Record<string, string> = {
  nuevo: 'Nuevo',
  editar: 'Editar',
};
