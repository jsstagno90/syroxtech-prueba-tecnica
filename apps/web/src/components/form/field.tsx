import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Envoltorio común de todos los campos: label, control, ayuda y error. */
export function Field({ id, label, required, description, error, className, children }: FieldProps) {
  return (
    <div className={cn('grid gap-2', className)} data-invalid={!!error || undefined}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {description && !error && <p className="text-muted-foreground text-xs">{description}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
