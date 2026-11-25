import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/config/site';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
