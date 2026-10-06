import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================================
// DEVELOPMENT ONLY: Authentication temporarily disabled
// Opens directly to /dashboard without requiring authentication.
// ============================================================================
export default async function Home() {
  // Always redirect directly to /dashboard for development
  redirect('/dashboard');

  // Kept for re-enabling authentication:
  /*
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  */
}
