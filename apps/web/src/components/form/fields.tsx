'use client';

import { useId, type ComponentProps } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Field } from './field';

/**
 * Campos de formulario conectados a react-hook-form.
 * Uso: <TextField control={form.control} name="name" label="Nombre" required />
 * El tipo de `name` se valida contra el schema del formulario.
 */
interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  description?: string;
  className?: string;
}

type InputProps = Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'onChange' | 'defaultValue'>;

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  className,
  ...inputProps
}: BaseFieldProps<T> & InputProps) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field id={id} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
          <Input
            id={id}
            {...inputProps}
            {...field}
            value={field.value ?? ''}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? `${id}-error` : undefined}
          />
        </Field>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  className,
  ...inputProps
}: BaseFieldProps<T> & InputProps) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field id={id} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            {...inputProps}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={typeof field.value === 'number' && Number.isFinite(field.value) ? field.value : ''}
            // Vacío = undefined, así el schema muestra "Ingresá un número" en lugar de tomar 0.
            onChange={(event) => field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)}
            aria-invalid={fieldState.invalid}
          />
        </Field>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  className,
  ...textareaProps
}: BaseFieldProps<T> & Omit<ComponentProps<typeof Textarea>, 'name' | 'value' | 'onChange' | 'defaultValue'>) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field id={id} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
          <Textarea id={id} {...textareaProps} {...field} value={field.value ?? ''} aria-invalid={fieldState.invalid} />
        </Field>
      )}
    />
  );
}

export interface SelectOption<V extends string | number = string | number> {
  value: V;
  label: string;
  disabled?: boolean;
}

const NONE = '__none__';

/**
 * Select que trabaja con números o strings (los de Radix solo aceptan strings).
 * Con `noneLabel`, agrega una opción que guarda `null` (ej. "Principal (sin padre)").
 */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  className,
  options,
  placeholder = 'Seleccioná una opción',
  noneLabel,
  disabled,
}: BaseFieldProps<T> & {
  options: SelectOption[];
  placeholder?: string;
  noneLabel?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const current = field.value === null ? (noneLabel ? NONE : '') : field.value === undefined ? '' : String(field.value);
        return (
          <Field id={id} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
            <Select
              value={current}
              disabled={disabled}
              onValueChange={(value) => {
                if (value === NONE) return field.onChange(null);
                const option = options.find((item) => String(item.value) === value);
                field.onChange(option?.value ?? value);
              }}
            >
              <SelectTrigger id={id} ref={field.ref} onBlur={field.onBlur} aria-invalid={fieldState.invalid}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
                {options.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        );
      }}
    />
  );
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: BaseFieldProps<T>) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={className}>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="grid gap-1">
              <Label htmlFor={id}>{label}</Label>
              {description && <p className="text-muted-foreground text-xs">{description}</p>}
            </div>
            <Switch id={id} checked={!!field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
          </div>
        </div>
      )}
    />
  );
}

export function CheckboxField<T extends FieldValues>({ control, name, label, className }: BaseFieldProps<T>) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={`flex items-center gap-2 ${className ?? ''}`}>
          <Checkbox id={id} checked={!!field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
          <Label htmlFor={id} className="font-normal">
            {label}
          </Label>
        </div>
      )}
    />
  );
}
