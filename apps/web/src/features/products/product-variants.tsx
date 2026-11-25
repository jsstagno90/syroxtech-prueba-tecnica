'use client';

import { useId, useState } from 'react';
import { Layers, Plus, Trash2, X } from 'lucide-react';
import {
  MAX_VARIANT_OPTIONS,
  MAX_VARIANTS,
  buildVariantCombinations,
  variantKey,
  type ProductVariantInput,
  type VariantOption,
} from '@admin/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const SUGGESTED_OPTIONS = ['Talla', 'Color', 'Material'];

/**
 * Arma las variantes a partir de las opciones conservando lo ya cargado
 * (SKU, precio, activa) de las combinaciones que siguen existiendo.
 */
export function syncVariants(options: VariantOption[], current: ProductVariantInput[]): ProductVariantInput[] {
  const valid = options.filter((option) => option.name.trim() && option.values.length);
  const previous = new Map(current.map((variant) => [variantKey(variant.options, valid), variant]));
  return buildVariantCombinations(valid).map((combo) => {
    const existing = previous.get(variantKey(combo, valid));
    return existing ? { ...existing, options: combo } : { options: combo, sku: '', price: null, isActive: true };
  });
}

type OptionErrors = { name?: { message?: string }; values?: { message?: string } }[] | undefined;

interface OptionsEditorProps {
  value: VariantOption[];
  onChange: (options: VariantOption[]) => void;
  errors?: OptionErrors;
}

/** "Opciones del producto": cada opción (Talla, Color...) con sus valores como chips. */
export function VariantOptionsEditor({ value, onChange, errors }: OptionsEditorProps) {
  const update = (index: number, patch: Partial<VariantOption>) =>
    onChange(value.map((option, i) => (i === index ? { ...option, ...patch } : option)));

  const nextSuggestion = SUGGESTED_OPTIONS.find((name) => !value.some((option) => option.name === name)) ?? '';

  return (
    <div className="grid gap-3">
      {value.map((option, index) => (
        <OptionCard
          key={index}
          index={index}
          option={option}
          error={errors?.[index]}
          onChange={(patch) => update(index, patch)}
          onRemove={() => onChange(value.filter((_, i) => i !== index))}
        />
      ))}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={value.length >= MAX_VARIANT_OPTIONS}
          onClick={() => onChange([...value, { name: nextSuggestion, values: [] }])}
        >
          <Plus /> Agregar opción
        </Button>
        <span className="text-muted-foreground text-xs">
          {value.length >= MAX_VARIANT_OPTIONS ? `Máximo ${MAX_VARIANT_OPTIONS} opciones` : 'Ej: Talla, Color o Material'}
        </span>
      </div>
    </div>
  );
}

function OptionCard({
  index,
  option,
  error,
  onChange,
  onRemove,
}: {
  index: number;
  option: VariantOption;
  error?: NonNullable<OptionErrors>[number];
  onChange: (patch: Partial<VariantOption>) => void;
  onRemove: () => void;
}) {
  const nameId = useId();
  const valueId = useId();
  const listId = useId();
  const [draft, setDraft] = useState('');

  // Se pueden cargar varios valores juntos separados por coma: "38, 39, 40".
  const addDraft = () => {
    const incoming = draft
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !option.values.some((current) => current.toLowerCase() === item.toLowerCase()));
    if (incoming.length) onChange({ values: [...option.values, ...incoming] });
    setDraft('');
  };

  return (
    <fieldset className="grid gap-3 rounded-lg border p-4">
      <legend className="sr-only">Opción {index + 1}</legend>
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-2">
          <Label htmlFor={nameId} className="flex items-center gap-2">
            Nombre de la opción
            {option.name && <Badge variant="info">{option.name}</Badge>}
          </Label>
          <Input
            id={nameId}
            list={listId}
            value={option.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Ej: Talla"
            maxLength={30}
            aria-invalid={!!error?.name}
          />
          <datalist id={listId}>
            {SUGGESTED_OPTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label={`Quitar la opción ${option.name || index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>
      {error?.name?.message && <p className="text-destructive text-xs">{error.name.message}</p>}

      <div className="grid gap-2">
        <Label htmlFor={valueId}>Valores disponibles</Label>
        {option.values.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={`Valores de ${option.name || 'la opción'}`}>
            {option.values.map((value) => (
              <li key={value}>
                <Badge variant="outline" className="gap-1 py-1 pr-1 pl-2 text-sm font-normal">
                  {value}
                  <button
                    type="button"
                    className="hover:bg-muted rounded p-0.5"
                    onClick={() => onChange({ values: option.values.filter((item) => item !== value) })}
                    aria-label={`Quitar ${value}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            id={valueId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addDraft();
              }
            }}
            placeholder="Escribí un valor y Enter (o varios separados por coma)"
            aria-invalid={!!error?.values}
          />
          <Button type="button" variant="outline" onClick={addDraft} disabled={!draft.trim()}>
            <Plus /> Agregar valor
          </Button>
        </div>
        {error?.values?.message && <p className="text-destructive text-xs">{error.values.message}</p>}
      </div>
    </fieldset>
  );
}

type VariantErrors = ({ sku?: { message?: string }; price?: { message?: string }; message?: string } | undefined)[];

interface VariantsTableProps {
  options: VariantOption[];
  value: ProductVariantInput[];
  onChange: (variants: ProductVariantInput[]) => void;
  basePrice?: number;
  errors?: VariantErrors;
  rootError?: string;
}

/** "Variantes del producto": una fila por combinación, con SKU, precio propio y si está activa. */
export function VariantsTable({ options, value, onChange, basePrice, errors, rootError }: VariantsTableProps) {
  const validOptions = options.filter((option) => option.name.trim() && option.values.length);
  const update = (index: number, patch: Partial<ProductVariantInput>) =>
    onChange(value.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));

  if (!value.length) {
    return (
      <div className="text-muted-foreground grid place-items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm">
        <Layers className="size-6 opacity-40" />
        Definí opciones de producto para generar variantes automáticamente.
        {rootError && <p className="text-destructive text-xs">{rootError}</p>}
      </div>
    );
  }

  const tooMany = value.length > MAX_VARIANTS;
  const activeCount = value.filter((variant) => variant.isActive).length;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          {value.length} variantes · {activeCount} activas
        </p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(value.map((v) => ({ ...v, isActive: true })))}>
            Activar todas
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(value.map((v) => ({ ...v, price: null })))}>
            Usar precio base en todas
          </Button>
        </div>
      </div>
      {(tooMany || rootError) && (
        <p role="alert" className="text-destructive text-xs">
          {tooMany ? `Son demasiadas combinaciones: el máximo es ${MAX_VARIANTS}. Quitá algunos valores.` : rootError}
        </p>
      )}
      <div className="max-h-[28rem] overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
            <tr className="text-muted-foreground text-left">
              <th className="px-3 py-2 font-medium">Variante</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Precio</th>
              <th className="px-3 py-2 text-center font-medium">Activa</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {value.map((variant, index) => {
              const label = validOptions.map((option) => variant.options[option.name]).join(' / ');
              const rowError = errors?.[index];
              return (
                <tr key={variantKey(variant.options, validOptions)} className={cn(!variant.isActive && 'opacity-60')}>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {validOptions.map((option) => (
                        <Badge key={option.name} variant="neutral" title={option.name}>
                          {variant.options[option.name]}
                        </Badge>
                      ))}
                    </div>
                    {rowError?.message && <p className="text-destructive mt-1 text-xs">{rowError.message}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={variant.sku ?? ''}
                      onChange={(event) => update(index, { sku: event.target.value })}
                      placeholder="Opcional"
                      maxLength={40}
                      className="h-8 min-w-28"
                      aria-label={`SKU de ${label}`}
                      aria-invalid={!!rowError?.sku}
                    />
                    {rowError?.sku?.message && <p className="text-destructive mt-1 text-xs">{rowError.sku.message}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={variant.price ?? ''}
                      onChange={(event) =>
                        update(index, { price: event.target.value === '' ? null : event.target.valueAsNumber })
                      }
                      placeholder={basePrice ? formatCurrency(basePrice) : 'Precio base'}
                      className="h-8 min-w-28"
                      aria-label={`Precio de ${label} (vacío usa el precio del producto)`}
                      aria-invalid={!!rowError?.price}
                    />
                    {rowError?.price?.message && <p className="text-destructive mt-1 text-xs">{rowError.price.message}</p>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={variant.isActive}
                      onCheckedChange={(checked) => update(index, { isActive: checked })}
                      aria-label={`${label} activa`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">Si dejás el precio vacío, la variante usa el precio del producto.</p>
    </div>
  );
}
