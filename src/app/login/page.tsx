'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Field, HeaderBand, LogoLockup } from '@/components/ui';
import { login } from '@/lib/api';
import { session } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session.get()) router.replace('/offers');
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/offers');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <HeaderBand className="pt-12 pb-28">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-gutter text-center">
          <LogoLockup tone="onInk" markSize={34} />
          <h1 className="font-display text-h1">Tazmify Ops</h1>
        </div>
      </HeaderBand>
      <main className="relative -mt-16 px-gutter pb-12">
        <Card elevated padded={false} className="mx-auto max-w-md p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <h2 className="font-display text-h3">Sign in</h2>
            <Field label="Email" type="email" required autoComplete="username" variant="filled" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Password" type="password" required autoComplete="current-password" variant="filled" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />

            <Button type="submit" size="lg" block loading={loading}>Sign in</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
