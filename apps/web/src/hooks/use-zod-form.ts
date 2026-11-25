'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/client';

/**
 * useForm + el schema de Zod compartido con la API: el formulario valida
 * exactamente las mismas reglas que el backend.
 */
export function useZodForm<TInput extends FieldValues, TOutput>(
  schema: z.ZodType<TOutput, TInput>,
  defaultValues: DefaultValues<TInput>,
) {
  return useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
    defaultValues,
    // Valida al enviar y después en cada cambio. Validar al salir del campo hace que
    // aparezcan errores mientras el usuario hace click en otro botón y lo corre de lugar.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
}

/**
 * Lleva los errores de la API al formulario: "name: Ya existe..." se muestra debajo
 * del campo `name`. Lo que no es de un campo puntual va a un toast.
 */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T, unknown, unknown>, error: unknown) {
  if (!(error instanceof ApiError)) {
    toast.error('Ocurrió un error inesperado');
    return;
  }

  let assigned = false;
  for (const detail of error.details) {
    const match = /^([\w.]+): (.+)$/.exec(detail);
    if (match && match[1].split('.')[0]! in form.getValues()) {
      form.setError(match[1] as Path<T>, { type: 'server', message: match[2] });
      assigned = true;
    }
  }
  if (!assigned) toast.error(error.message);
}
