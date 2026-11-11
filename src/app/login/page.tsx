'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Field, LogoLockup, LogoMark } from '@/components/ui';
import { login } from '@/lib/api';
import { homeFor } from '@/lib/roles';
import { session } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = session.get();
    if (s) router.replace(homeFor(s.role));
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      router.replace(homeFor((await login(email, password)).role));
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <LogoLockup tone="onInk" markSize={28} />
        <div className="relative max-w-md">
          <p className="text-micro font-semibold uppercase text-lavender">Tazmify Admin</p>
          <p className="mt-4 font-display text-display">Run the marketplace from one place.</p>
          <p className="mt-4 text-body-lg text-sidebar-text">Creators, brands, venue offers and support, for the Tazmify team.</p>
        </div>
        <p className="relative text-small text-sidebar-muted">Staff accounts only.</p>
        <LogoMark size={520} tone="onInk" className="pointer-events-none absolute -right-28 -bottom-24 opacity-10" />
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <LogoLockup markSize={28} className="mb-10 lg:hidden" />
          <h1 className="font-display text-hero">Sign in</h1>
          <p className="mt-2 text-body-lg text-ink-muted">Use your Tazmify staff account.</p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <Field label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
            <Button type="submit" size="lg" block loading={loading} className="mt-2">Sign in</Button>
          </form>
        </div>
      </main>
    </div>
  );
}
