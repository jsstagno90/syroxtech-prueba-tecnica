'use client';

import type { ReactNode } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorageFlag } from '@/hooks/use-local-storage-flag';
import { cn } from '@/lib/utils';
import { AppHeader } from './app-header';
import { BrandLogo } from './brand-logo';
import { SidebarNav } from './sidebar-nav';

const COLLAPSED_KEY = 'sidebar-collapsed';

/** Estructura del panel: sidebar colapsable en desktop, menú lateral deslizable en mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorageFlag(COLLAPSED_KEY);
  const toggle = () => setCollapsed(!collapsed);

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'bg-sidebar border-sidebar-border sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('flex h-14 items-center border-b px-3', collapsed && 'justify-center')}>
          <BrandLogo collapsed={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav collapsed={collapsed} />
        </div>

        {/* Sobre el borde del menú: mismo lugar para abrirlo y cerrarlo, siempre visible. */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggle}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="bg-background text-muted-foreground hover:text-foreground absolute top-4 -right-3 size-6 rounded-full shadow-sm [&_svg]:size-3.5"
        >
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
