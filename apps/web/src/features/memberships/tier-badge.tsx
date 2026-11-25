import { Crown } from 'lucide-react';
import type { MembershipTierRef, TierColor } from '@admin/shared';
import { cn } from '@/lib/utils';

/** Clases completas (Tailwind no detecta nombres armados con variables). */
export const TIER_COLOR_CLASSES: Record<TierColor, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
  amber: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  zinc: 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  yellow: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300',
  sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
};

/** Distintivo del nivel de membresía de un cliente. */
export function TierBadge({ tier, className }: { tier: Pick<MembershipTierRef, 'name' | 'color'> | null; className?: string }) {
  if (!tier) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TIER_COLOR_CLASSES[tier.color],
        className,
      )}
    >
      <Crown className="size-3" />
      {tier.name}
    </span>
  );
}
