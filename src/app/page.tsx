'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeFor } from '@/lib/roles';
import { session } from '@/lib/session';

// The role lives in sessionStorage, so the landing is chosen in the browser.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const s = session.get();
    router.replace(s ? homeFor(s.role) : '/login');
  }, [router]);
  return null;
}
