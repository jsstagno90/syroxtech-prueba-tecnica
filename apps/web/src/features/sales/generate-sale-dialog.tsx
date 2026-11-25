'use client';

import { useMemo } from 'react';
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  calculateSaleTotals,
  createSaleSchema,
  formatDiscountValue,
  type CreateSaleDto,
  type CreateSaleInput,
  type ProductOption,
} from '@admin/shared';
import { discountHooks } from '@/features/discounts/api';
import { FormDialog } from '@/components/crud/form-dialog';
import { NumberField, SelectField, TextField, TextareaField } from '@/components/form/fields';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { productHooks } from '@/features/products/api';
import { formatCurrency } from '@/lib/format';
import { saleHooks } from './api';

type SaleForm = UseFormReturn<CreateSaleInput, unknown, CreateSaleDto>;

type SaleItemInput = CreateSaleInput['items'][number];

/** Línea nueva: el producto queda sin elegir (el schema obliga a completarlo). */
const emptyItem = () => ({ quantity: 1 }) as SaleItemInput;

const DEFAULT_VALUES: CreateSaleInput = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  shippingAddress: '',
  paymentMethod: 'CARD',
  paymentStatus: 'PAID',
  notes: '',
  discountCode: null,
  items: [emptyItem()],
};

const paymentMethodOptions = PAYMENT_METHODS.map((method) => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }));
const paymentStatusOptions = [
  { value: 'PAID', label: 'Pagado' },
  { value: 'PENDING', label: 'Pendiente de pago' },
];

/**
 * "Generar venta": crea una venta real en la base. El total que se ve acá es una vista previa;
 * el definitivo lo calcula la API con los precios guardados.
 */
export function GenerateSaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = saleHooks.useCreate();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generar venta"
      description="Registrá una venta con sus productos. Queda en estado Pendiente."
      schema={createSaleSchema}
      defaultValues={DEFAULT_VALUES}
      submitLabel="Generar venta"
      onSubmit={(values) => create.mutateAsync(values)}
      className="sm:max-w-2xl"
    >
      {(form) => <SaleFormFields form={form} />}
    </FormDialog>
  );
}

function SaleFormFields({ form }: { form: SaleForm }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-4">
        <h3 className="text-sm font-semibold">Cliente</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="customerName" label="Nombre" placeholder="Nombre y apellido" required autoFocus />
          <TextField control={form.control} name="customerEmail" label="Correo" type="email" placeholder="cliente@mail.com" required />
          <TextField control={form.control} name="customerPhone" label="Teléfono" placeholder="Opcional" />
          <TextField control={form.control} name="shippingAddress" label="Dirección de envío" placeholder="Opcional" />
        </div>
      </section>

      <Separator />
      <SaleItemsFields form={form} />
      <Separator />

      <section className="grid gap-4 sm:grid-cols-2">
        <SelectField control={form.control} name="paymentMethod" label="Medio de pago" options={paymentMethodOptions} required />
        <SelectField control={form.control} name="paymentStatus" label="Estado del pago" options={paymentStatusOptions} required />
        <CouponField form={form} />
        <TextareaField control={form.control} name="notes" label="Notas" placeholder="Opcional" rows={2} />
      </section>

      <SaleTotals form={form} />
    </div>
  );
}

/** Cupones vigentes. La API vuelve a validar al guardar (vigencia, mínimo y usos). */
function CouponField({ form }: { form: SaleForm }) {
  const { data: coupons = [] } = discountHooks.useOptions();
  return (
    <SelectField
      control={form.control}
      name="discountCode"
      label="Cupón de descuento"
      placeholder={coupons.length ? 'Sin cupón' : 'No hay cupones vigentes'}
      noneLabel="Sin cupón"
      disabled={!coupons.length}
      options={coupons.map((coupon) => ({
        value: coupon.code,
        label: `${coupon.code} · ${formatDiscountValue(coupon, formatCurrency)}${coupon.minPurchase ? ` (mín. ${formatCurrency(coupon.minPurchase)})` : ''}`,
      }))}
    />
  );
}

/** Vista previa de subtotal, descuento y total con los precios actuales. */
function SaleTotals({ form }: { form: SaleForm }) {
  const [items, discountCode] = useWatch({ control: form.control, name: ['items', 'discountCode'] });
  const { data: products = [] } = productHooks.useOptions();
  const { data: coupons = [] } = discountHooks.useOptions();
  const coupon = coupons.find((item) => item.code === discountCode) ?? null;

  const lines = (items ?? []).map((item) => ({
    unitPrice: products.find((product) => product.id === item?.productId)?.price ?? 0,
    quantity: Number.isFinite(item?.quantity) ? item.quantity : 0,
  }));
  const base = calculateSaleTotals(lines);
  const belowMinimum = !!coupon?.minPurchase && base.subtotal < coupon.minPurchase;
  const preview = calculateSaleTotals(lines, belowMinimum ? null : coupon);

  return (
    <div className="bg-muted/50 grid gap-1.5 rounded-lg px-4 py-3">
      {coupon && (
        <>
          <div className="text-muted-foreground flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(preview.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400">
            <span>Cupón {coupon.code}</span>
            <span className="tabular-nums">− {formatCurrency(preview.discountAmount)}</span>
          </div>
        </>
      )}
      {belowMinimum && (
        <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
          El cupón {coupon!.code} pide una compra mínima de {formatCurrency(coupon!.minPurchase!)}: así no se va a poder aplicar.
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Total estimado</span>
        <span className="text-lg font-semibold tabular-nums">{formatCurrency(preview.total)}</span>
      </div>
    </div>
  );
}

function SaleItemsFields({ form }: { form: SaleForm }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const items = useWatch({ control: form.control, name: 'items' });
  const { data: products = [], isLoading } = productHooks.useOptions();

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const preview = useMemo(() => {
    const lines = (items ?? []).map((item) => ({
      unitPrice: productsById.get(item?.productId)?.price ?? 0,
      quantity: Number.isFinite(item?.quantity) ? item.quantity : 0,
    }));
    return calculateSaleTotals(lines);
  }, [items, productsById]);

  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Productos</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(emptyItem())}
          disabled={fields.length >= products.length && !isLoading}
        >
          <Plus /> Agregar producto
        </Button>
      </div>

      <div className="grid gap-3">
        {fields.map((field, index) => {
          // Un producto ya elegido en otra línea no se puede volver a elegir.
          const usedElsewhere = new Set(items?.filter((_, i) => i !== index).map((item) => item?.productId));
          return (
            <div key={field.id} className="grid grid-cols-[1fr_5.5rem_auto] items-start gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
              <SelectField
                control={form.control}
                name={`items.${index}.productId`}
                label={index === 0 ? 'Producto' : ''}
                placeholder={isLoading ? 'Cargando...' : 'Elegí un producto'}
                options={products.map((product: ProductOption) => ({
                  value: product.id,
                  label: `${product.name} · ${formatCurrency(product.price)}`,
                  disabled: usedElsewhere.has(product.id),
                }))}
                className="[&_label:empty]:hidden"
              />
              <NumberField
                control={form.control}
                name={`items.${index}.quantity`}
                label={index === 0 ? 'Cantidad' : ''}
                min={1}
                step={1}
                className="[&_label:empty]:hidden"
              />
              <div className="hidden h-9 items-center justify-end self-end text-sm font-medium tabular-nums sm:flex">
                {formatCurrency(preview.lines[index]?.subtotal ?? 0)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive self-end"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label={`Quitar producto ${index + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
      </div>

      {itemsError && (
        <p role="alert" className="text-destructive text-xs">
          {itemsError}
        </p>
      )}
    </section>
  );
}
