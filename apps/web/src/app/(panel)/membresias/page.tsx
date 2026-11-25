import type { Metadata } from 'next';
import { MembershipsPage } from '@/features/memberships/memberships-page';

export const metadata: Metadata = { title: 'Membresías' };

export default function Page() {
  return <MembershipsPage />;
}
