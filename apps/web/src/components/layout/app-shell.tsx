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
          'bg-sidebar border-sidebar-border sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('flex h-14 items-center border-b px-3', collapsed ? 'justify-center' : 'justify-between')}>
          <BrandLogo collapsed={collapsed} />
          {!collapsed && (
            <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Contraer menú">
              <ChevronsLeft />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav collapsed={collapsed} />
        </div>
        {collapsed && (
          <div className="border-t p-3">
            <Button variant="ghost" size="icon" className="w-full" onClick={toggle} aria-label="Expandir menú">
              <ChevronsRight />
            </Button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
