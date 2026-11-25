'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { loginSchema } from '@admin/shared';
import { CheckboxField, TextField } from '@/components/form/fields';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/hooks/use-zod-form';
import { useLogin } from './use-session';

const DEMO = {
  email: process.env.NEXT_PUBLIC_DEMO_EMAIL ?? 'admin@demo.com',
  password: process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? 'demo1234',
};
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS !== 'false';

export function LoginForm() {
  const form = useZodForm(loginSchema, { email: '', password: '', remember: false });
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('expired')) {
      toast.info('Tu sesión venció. Volvé a iniciar sesión.');
    }
  }, []);

  const onSubmit = form.handleSubmit((values) => login.mutateAsync(values).catch(() => undefined));

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <TextField
        control={form.control}
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="ejemplo@mail.com"
        autoFocus
      />

      <div className="relative">
        <TextField
          control={form.control}
          name="password"
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          className="[&_input]:pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className="text-muted-foreground hover:text-foreground absolute top-[1.85rem] right-2.5 p-0.5"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <CheckboxField control={form.control} name="remember" label="Mantener sesión iniciada" />

      {login.isError && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {login.error.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending && <Loader2 className="animate-spin" />}
        Ingresar
      </Button>

      {SHOW_DEMO && (
        <div className="bg-muted/60 text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
          <p>
            Acceso de prueba: <span className="text-foreground font-medium">{DEMO.email}</span> /{' '}
            <span className="text-foreground font-medium">{DEMO.password}</span>
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 pt-1 text-xs"
            onClick={() => {
              form.setValue('email', DEMO.email, { shouldValidate: true });
              form.setValue('password', DEMO.password, { shouldValidate: true });
            }}
          >
            Completar con el usuario demo
          </Button>
        </div>
      )}
    </form>
  );
}
