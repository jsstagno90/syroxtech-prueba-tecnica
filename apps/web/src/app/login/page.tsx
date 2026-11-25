import type { Metadata } from 'next';
import { BrandLogo } from '@/components/layout/brand-logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm gap-6">
        <CardHeader className="items-center text-center">
          <BrandLogo className="mb-3 justify-center [&>span:last-child]:text-lg" />
          <CardTitle className="text-2xl font-bold">Iniciá sesión</CardTitle>
          <CardDescription>Ingresá a tu cuenta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
