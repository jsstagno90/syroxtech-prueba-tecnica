'use client';

import { useEffect, type ReactNode } from 'react';
import type { DefaultValues, FieldValues, UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { applyServerErrors, useZodForm } from '@/hooks/use-zod-form';

interface FormDialogProps<TInput extends FieldValues, TOutput> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: z.ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  onSubmit: (values: TOutput) => Promise<unknown>;
  submitLabel?: string;
  /** Los campos del formulario; reciben el form ya tipado. */
  children: (form: UseFormReturn<TInput, unknown, TOutput>) => ReactNode;
  className?: string;
}

/**
 * Modal de alta/edición genérico: validación con Zod, estado de envío,
 * errores de la API en los campos y cierre al guardar.
 */
export function FormDialog<TInput extends FieldValues, TOutput>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar',
  children,
  className,
}: FormDialogProps<TInput, TOutput>) {
  const form = useZodForm(schema, defaultValues);

  // Cada vez que se abre (para crear o para editar otro registro) arranca con los valores correctos.
  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          {children(form)}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
