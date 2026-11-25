import { ShoppingBag } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

export function BrandLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
        <ShoppingBag className="size-4" />
      </span>
      {!collapsed && <span className="truncate font-semibold tracking-tight">{siteConfig.name}</span>}
    </div>
  );
}
