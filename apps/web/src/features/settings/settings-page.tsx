'use client';

import Link from 'next/link';
import { BookOpen, Gift, Loader2, Store, UserRound } from 'lucide-react';
import { storeSettingsSchema, type StoreSettingsResponse } from '@admin/shared';
import { TextField } from '@/components/form/fields';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/use-session';
import { applyServerErrors, useZodForm } from '@/hooks/use-zod-form';
import { formatDateTime } from '@/lib/format';
import { useStoreSettings, useUpdateStoreSettings } from './api';

export function SettingsPage() {
  const settings = useStoreSettings();
  const { data: user } = useSession();

  return (
    <>
      <PageHeader title="Configuración" description="Datos de la tienda y de tu cuenta." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {settings.data ? (
            // La key remonta el formulario si los datos cambian desde otra pestaña.
            <StoreForm key={settings.data.updatedAt} settings={settings.data} />
          ) : (
            <Skeleton className="h-96 rounded-xl" />
          )}
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" /> Tu cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p className="font-medium">{user?.name ?? '—'}</p>
              <p className="text-muted-foreground">{user?.email}</p>
              <p className="text-muted-foreground mt-2 text-xs">Acceso de administrador (sin roles, como pide la consigna).</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Más opciones</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/lealtad">
                  <Gift /> Programa de puntos
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/ayuda">
                  <BookOpen /> Ayuda y documentación
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function StoreForm({ settings }: { settings: StoreSettingsResponse }) {
  const update = useUpdateStoreSettings();
  const form = useZodForm(storeSettingsSchema, {
    storeName: settings.storeName,
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    address: settings.address ?? '',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-4" /> Datos de la tienda
          </CardTitle>
          <CardDescription>El nombre se muestra en el menú del panel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="storeName" label="Nombre de la tienda" required className="sm:col-span-2" />
          <TextField control={form.control} name="contactEmail" label="Correo de contacto" type="email" placeholder="hola@mitienda.com" />
          <TextField control={form.control} name="contactPhone" label="Teléfono" placeholder="Ej: 291 455-1200" />
          <TextField control={form.control} name="address" label="Dirección" placeholder="Calle, número y ciudad" className="sm:col-span-2" />
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3 border-t">
          <p className="text-muted-foreground text-xs">Última modificación: {formatDateTime(settings.updatedAt)}</p>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Guardar cambios
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
