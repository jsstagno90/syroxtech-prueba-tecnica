'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigation } from '@/config/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * La ruta actual solo se conoce al momento del request: el Suspense deja que el resto
 * del layout se prerenderice (Cache Components de Next 16).
 */
export function SidebarNav(props: SidebarNavProps) {
  return (
    <Suspense fallback={<SidebarNavLinks {...props} pathname="" />}>
      <SidebarNavWithPath {...props} />
    </Suspense>
  );
}

function SidebarNavWithPath(props: SidebarNavProps) {
  return <SidebarNavLinks {...props} pathname={usePathname()} />;
}

function SidebarNavLinks({ collapsed = false, onNavigate, pathname }: SidebarNavProps & { pathname: string }) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Navegación principal">
      {navigation.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {!collapsed && (
            <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">{group.label}</p>
          )}
          {group.items.map((item) => {
            const active = isActivePath(pathname, item.href);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                  collapsed && 'justify-center px-0',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
  );
}
