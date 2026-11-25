'use client';

import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Nombre del registro, para lectores de pantalla ("Editar Running"). */
  label: string;
}

/** Acciones por fila (ver / editar / eliminar), iguales en todas las tablas. */
export function RowActions({ onView, onEdit, onDelete, label }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onView && <ActionButton icon={Eye} tooltip="Ver detalle" ariaLabel={`Ver ${label}`} onClick={onView} />}
      {onEdit && <ActionButton icon={Pencil} tooltip="Editar" ariaLabel={`Editar ${label}`} onClick={onEdit} />}
      {onDelete && (
        <ActionButton
          icon={Trash2}
          tooltip="Eliminar"
          ariaLabel={`Eliminar ${label}`}
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        />
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  tooltip,
  ariaLabel,
  onClick,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  tooltip: string;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={onClick} aria-label={ariaLabel} className={cn('size-8', className)}>
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
