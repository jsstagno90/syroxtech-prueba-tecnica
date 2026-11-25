import { ShoppingBag } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

/** Logo con el nombre de la tienda. En el panel se le pasa el nombre guardado en Configuración. */
export function BrandLogo({ collapsed = false, className, name }: { collapsed?: boolean; className?: string; name?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
        <ShoppingBag className="size-4" />
      </span>
      {!collapsed && <span className="truncate font-semibold tracking-tight">{name ?? siteConfig.name}</span>}
    </div>
  );
}
