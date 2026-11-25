'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Miniatura del producto; si no tiene imagen o la URL falla, muestra un ícono. */
export function ProductThumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn('bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-md border', className)}>
        <ImageOff className="size-4" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URLs externas arbitrarias cargadas por el usuario
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('size-10 shrink-0 rounded-md border object-cover', className)}
    />
  );
}
