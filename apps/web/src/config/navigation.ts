import {
  BadgePercent,
  BarChart3,
  Bell,
  CircleHelp,
  Crown,
  FolderTree,
  Gift,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';

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
      { title: 'Clientes', href: '/clientes', icon: Users },
      { title: 'Estadísticas', href: '/estadisticas', icon: BarChart3 },
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
  {
    label: 'Fidelización',
    items: [
      { title: 'Descuentos', href: '/descuentos', icon: BadgePercent },
      { title: 'Puntos de lealtad', href: '/lealtad', icon: Gift },
      { title: 'Membresías', href: '/membresias', icon: Crown },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Notificaciones', href: '/notificaciones', icon: Bell },
      { title: 'Configuración', href: '/configuracion', icon: Settings },
      { title: 'Ayuda', href: '/ayuda', icon: CircleHelp },
    ],
  },
];

/** Nombres para las migas de pan de rutas que no están en el menú. */
export const breadcrumbLabels: Record<string, string> = {
  nuevo: 'Nuevo',
  editar: 'Editar',
};
