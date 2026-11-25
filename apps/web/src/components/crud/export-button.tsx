'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  /** Arma y descarga el archivo; devuelve cuántos registros exportó. */
  onExport: () => Promise<number>;
  /** "productos", "ventas": para el mensaje de confirmación. */
  entityLabel: string;
  label?: string;
}

/** Botón "Exportar" con estado de carga y aviso del resultado. */
export function ExportButton({ onExport, entityLabel, label = 'Exportar' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleClick = async () => {
    setExporting(true);
    try {
      const count = await onExport();
      if (count === 0) toast.info(`No hay ${entityLabel} para exportar con esos filtros`);
      else toast.success(`Se exportaron ${count} ${entityLabel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el archivo');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={exporting}>
      {exporting ? <Loader2 className="animate-spin" /> : <Download />}
      {label}
    </Button>
  );
}
