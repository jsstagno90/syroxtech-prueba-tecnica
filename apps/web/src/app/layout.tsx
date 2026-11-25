import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Providers } from '@/components/providers';
import { siteConfig } from '@/config/site';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${siteConfig.name} · Admin`, template: `%s · ${siteConfig.name}` },
  description: 'Panel administrativo de e-commerce: productos, categorías y ventas.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
