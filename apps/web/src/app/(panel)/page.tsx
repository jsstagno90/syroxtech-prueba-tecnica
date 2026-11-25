import type { Metadata } from 'next';
import { DashboardPage } from '@/features/dashboard/dashboard-page';

export const metadata: Metadata = { title: 'Inicio' };

export default function Page() {
  return <DashboardPage />;
}
