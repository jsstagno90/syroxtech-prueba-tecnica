import type { Metadata } from 'next';
import { LoyaltyPage } from '@/features/loyalty/loyalty-page';

export const metadata: Metadata = { title: 'Puntos de lealtad' };

export default function Page() {
  return <LoyaltyPage />;
}
