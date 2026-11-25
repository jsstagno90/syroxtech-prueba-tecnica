'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Faq {
  topic: string;
  question: string;
  answer: string;
  href?: string;
}

const FAQS: Faq[] = [
  { topic: 'Ventas', question: '¿Cómo registro una venta?', answer: 'En Ventas tocá "Generar venta", cargá los datos del cliente, los productos y las cantidades. El total lo calcula el sistema con los precios guardados; si el cliente tiene un cupón, elegilo y se descuenta solo.', href: '/ventas' },
  { topic: 'Ventas', question: '¿Cómo cambio el estado de un pedido?', answer: 'Desde la tabla, con la flechita del estado, o desde "Gestionar orden". El flujo es Pendiente → En preparación → Enviado → Completado. Al marcarlo como enviado podés cargar el número de seguimiento.', href: '/ventas' },
  { topic: 'Ventas', question: 'Me equivoqué de estado o cancelé una venta por error', answer: 'Cada estado se puede volver un paso atrás desde el mismo menú. Una venta cancelada se puede reabrir como pendiente: si estaba cobrada, el pago vuelve a figurar como pagado.' },
  { topic: 'Productos', question: '¿Cómo cargo talles y colores?', answer: 'En el alta o edición del producto, en "Opciones del producto" agregá Talla, Color o Material con sus valores. Las variantes se generan solas y a cada una le podés poner SKU, un precio distinto o desactivarla.', href: '/productos/nuevo' },
  { topic: 'Productos', question: '¿Puedo cargar muchos productos juntos?', answer: 'Sí: "Importar productos" acepta Excel o CSV, te deja elegir qué columna es cada dato y muestra los errores fila por fila antes de guardar. Para cambiar varios a la vez, seleccionalos en la tabla y usá la barra de acciones.', href: '/productos' },
  { topic: 'Productos', question: '¿Qué formato tienen que tener las fotos?', answer: 'JPG, PNG o WebP, hasta 8 por producto. El panel las achica antes de subirlas. La primera es la principal; con la estrella cambiás cuál es.' },
  { topic: 'Clientes', question: '¿De dónde salen los clientes?', answer: 'De las ventas: cada correo distinto es un cliente. No hay que cargarlos aparte, y su gasto, nivel y puntos se actualizan con cada compra.', href: '/clientes' },
  { topic: 'Fidelización', question: '¿Cómo funcionan los puntos?', answer: 'Cada cliente suma 1 punto cada cierto monto gastado (se configura en Puntos de lealtad). Su nivel de membresía multiplica esos puntos. Las ventas canceladas no suman.', href: '/lealtad' },
  { topic: 'Fidelización', question: '¿Cómo creo un cupón?', answer: 'En Descuentos, "Nuevo cupón": porcentaje o monto fijo, compra mínima, límite de usos y fechas. Si un cupón venció, se agotó o está pausado, el sistema no deja usarlo.', href: '/descuentos' },
  { topic: 'Fidelización', question: '¿Cómo se asignan las membresías?', answer: 'Solas: cada cliente queda en el nivel más alto cuyo gasto mínimo ya alcanzó. Si cambiás los montos de un nivel, los clientes se reubican automáticamente.', href: '/membresias' },
  { topic: 'Reportes', question: '¿Puedo bajar los datos a Excel?', answer: 'Productos, ventas y clientes tienen botón "Exportar": descarga un Excel con lo que estás viendo (respeta búsqueda y filtros).' },
  { topic: 'Cuenta', question: '¿Dónde cambio el nombre de la tienda?', answer: 'En Configuración. El nombre se actualiza en el menú del panel al guardar.', href: '/configuracion' },
];

export function HelpPage() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return FAQS;
    return FAQS.filter((faq) => `${faq.topic} ${faq.question} ${faq.answer}`.toLowerCase().includes(term));
  }, [query]);
  const topics = [...new Set(filtered.map((faq) => faq.topic))];

  return (
    <>
      <PageHeader title="Ayuda" description="Respuestas rápidas para usar el panel." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en la ayuda (ej: cupón, talles, exportar)"
              className="pl-9"
              aria-label="Buscar en la ayuda"
            />
          </div>

          {topics.length === 0 && <p className="text-muted-foreground py-8 text-center text-sm">No encontramos nada con esa búsqueda.</p>}

          {topics.map((topic) => (
            <section key={topic} className="grid gap-2">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{topic}</h2>
              <div className="bg-card divide-y rounded-xl border">
                {filtered
                  .filter((faq) => faq.topic === topic)
                  .map((faq) => (
                    <details key={faq.question} className="group px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                        {faq.question}
                        <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{faq.answer}</p>
                      {faq.href && (
                        <Button variant="link" className="mt-1 h-auto px-0" asChild>
                          <Link href={faq.href}>Ir a la sección</Link>
                        </Button>
                      )}
                    </details>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentación</CardTitle>
              <CardDescription>Para quien instale o mantenga el panel.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-between" asChild>
                <a href="https://github.com/jsstagno90/syroxtech-prueba-tecnica#readme" target="_blank" rel="noreferrer">
                  Guía de instalación (README) <ExternalLink />
                </a>
              </Button>
              <p className="text-muted-foreground text-xs">
                La API tiene su documentación interactiva (Swagger) en <code className="bg-muted rounded px-1">/api/docs</code>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
