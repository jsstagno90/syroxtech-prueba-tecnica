'use client';

import { useWatch, type UseFormReturn } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import {
  PRICE_ROUNDINGS,
  PRICE_ROUNDING_LABELS,
  applyPriceChange,
  bulkPriceChangeSchema,
  type BulkPriceChangeDto,
  type BulkPriceChangeInput,
  type ProductResponse,
} from '@admin/shared';
import { FormDialog } from '@/components/crud/form-dialog';
import { NumberField, SelectField } from '@/components/form/fields';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const ROUNDING_OPTIONS = PRICE_ROUNDINGS.map((value) => ({ value, label: PRICE_ROUNDING_LABELS[value] }));
const PREVIEW_COUNT = 4;

interface PriceChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: number[];
  /** Productos elegidos que ya están cargados en pantalla, para la vista previa. */
  samples: ProductResponse[];
  onSubmit: (values: BulkPriceChangeDto) => Promise<unknown>;
}

/** Aumento (o rebaja) en % para varios productos, con redondeo y vista previa antes de aplicar. */
export function PriceChangeDialog({ open, onOpenChange, ids, samples, onSubmit }: PriceChangeDialogProps) {
  const total = ids.length === 1 ? '1 producto' : `${ids.length} productos`;
  return (
    <FormDialog<BulkPriceChangeInput, BulkPriceChangeDto>
      open={open}
      onOpenChange={onOpenChange}
      title="Cambiar precio"
      description={`Se va a aplicar a ${total}. Las variantes con precio propio también se ajustan.`}
      schema={bulkPriceChangeSchema}
      defaultValues={{ ids, roundTo: 1 }}
      submitLabel="Aplicar"
      onSubmit={(values) => onSubmit({ ...values, ids })}
    >
      {(form) => (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="percent"
              label="Porcentaje"
              placeholder="Ej: 10"
              description="Negativo para bajar (ej: -15)"
              step="0.1"
              min={-90}
              max={500}
              required
              autoFocus
            />
            <RoundingField form={form} />
          </div>
          <Preview form={form} samples={samples} total={ids.length} />
        </div>
      )}
    </FormDialog>
  );
}

type PriceForm = UseFormReturn<BulkPriceChangeInput, unknown, BulkPriceChangeDto>;

function RoundingField({ form }: { form: PriceForm }) {
  return (
    <SelectField
      control={form.control}
      name="roundTo"
      label="Redondeo"
      options={ROUNDING_OPTIONS}
      required
    />
  );
}

function Preview({ form, samples, total }: { form: PriceForm; samples: ProductResponse[]; total: number }) {
  const [percent, roundTo] = useWatch({ control: form.control, name: ['percent', 'roundTo'] });
  const valid = typeof percent === 'number' && Number.isFinite(percent) && percent !== 0 && percent >= -90 && percent <= 500;
  const shown = samples.slice(0, PREVIEW_COUNT);

  if (!shown.length) return null;

  return (
    <div className="bg-muted/50 grid gap-2 rounded-lg p-3">
      <p className="text-muted-foreground text-xs font-medium">Vista previa</p>
      <ul className="grid gap-1.5 text-sm">
        {shown.map((product) => {
          const next = valid ? applyPriceChange(product.price, percent, Number(roundTo ?? 1)) : null;
          return (
            <li key={product.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{product.name}</span>
              <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                <span className={cn(next !== null && 'text-muted-foreground line-through')}>{formatCurrency(product.price)}</span>
                {next !== null && (
                  <>
                    <ArrowRight className="text-muted-foreground size-3.5" />
                    <span className={cn('font-medium', next > product.price ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                      {formatCurrency(next)}
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {total > shown.length && (
        <p className="text-muted-foreground text-xs">y {total - shown.length} más con el mismo cálculo</p>
      )}
    </div>
  );
}
