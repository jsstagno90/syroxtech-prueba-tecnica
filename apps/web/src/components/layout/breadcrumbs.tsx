'use client';

import { Fragment, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { breadcrumbLabels, navigation } from '@/config/navigation';

const navTitles = new Map(navigation.flatMap((group) => group.items.map((item) => [item.href, item.title])));

/** Arma las migas de pan a partir de la URL (Inicio / Productos / Nuevo). */
export function Breadcrumbs() {
  return (
    <Suspense fallback={<div className="h-5" />}>
      <BreadcrumbTrail />
    </Suspense>
  );
}

function BreadcrumbTrail() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = [
    { href: '/', label: 'Inicio' },
    ...segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      const label = navTitles.get(href) ?? breadcrumbLabels[segment] ?? (/^\d+$/.test(segment) ? 'Editar' : segment);
      return { href, label };
    }),
  ];

  return (
    <nav aria-label="Migas de pan" className="min-w-0">
      <ol className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
              <li className="truncate">
                {last ? (
                  <span className="text-foreground font-medium" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
