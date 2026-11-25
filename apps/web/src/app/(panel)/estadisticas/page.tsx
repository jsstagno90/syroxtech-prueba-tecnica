import type { Metadata } from 'next';
import { StatsPage } from '@/features/stats/stats-page';

export const metadata: Metadata = { title: 'Estadísticas' };

export default function Page() {
  return <StatsPage />;
}
