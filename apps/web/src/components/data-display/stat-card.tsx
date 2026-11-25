import type { ComponentType } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

interface StatCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}

/** Indicador de una cifra con su contexto (lo usan Inicio, Estadísticas y Lealtad). */
export function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardDescription className="flex items-center justify-between">
          {label}
          <Icon className="size-4" />
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}
