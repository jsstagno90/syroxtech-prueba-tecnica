import { siteConfig } from '@/config/site';

const currency = new Intl.NumberFormat(siteConfig.locale, {
  style: 'currency',
  currency: siteConfig.currency,
  maximumFractionDigits: 2,
});

const date = new Intl.DateTimeFormat(siteConfig.locale, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: siteConfig.timeZone,
});

const dateTime = new Intl.DateTimeFormat(siteConfig.locale, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: siteConfig.timeZone,
});

const number = new Intl.NumberFormat(siteConfig.locale);

export const formatCurrency = (value: number) => currency.format(value);
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatNumber = (value: number) => number.format(value);

/** "Juan Pérez" → "JP" */
export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
