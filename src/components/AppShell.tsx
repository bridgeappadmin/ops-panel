'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { canOpen, homeFor, SECTIONS } from '@/lib/roles';
import { session, useSession } from '@/lib/session';
import { Button, Card, Chip, HeaderBand, LogoLockup } from './ui';

/**
 * Every signed-in page: header band with the logo, nav, the admin's name and Sign out, then the page. A page outside the signed-in level's sections renders a card instead of children, so its fetches never run.
 * Without a session (signed out, or a 401 cleared it) it sends you to /login and renders no page, so nothing
 * more is fetched.
 */
export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const s = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Reads storage itself: `s` is null during hydration even when signed in.
  useEffect(() => {
    if (!session.get()) router.replace('/login');
  }, [s, router]);

  return (
    <div className="min-h-screen">
      <HeaderBand className="pb-12">
        <div className="mx-auto max-w-6xl px-gutter">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
            <Link href={s ? homeFor(s.role) : '/login'} className="flex items-center gap-2">
              <LogoLockup tone="onInk" markSize={26} />
              <span className="text-small-sb text-lavender">Admin</span>
            </Link>
            {s ? (
              <>
                <nav aria-label="Main" className="flex flex-wrap gap-2">
                  {SECTIONS.filter((item) => item.roles.includes(s.role)).map((item) => (
                    <Chip key={item.href} href={item.href} label={item.label} onDark size="sm" selected={pathname.startsWith(item.href)} />
                  ))}
                </nav>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-small-md text-white/72">{s.name}</span>
                  <Button variant="tint" size="sm" onClick={() => session.clear()}>Sign out</Button>
                </div>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
            <h1 className="font-display text-h1">{title}</h1>
            {s ? actions : null}
          </div>
        </div>
      </HeaderBand>
      <main className="relative -mt-7 rounded-t-xxl bg-cloud">
        <div className="mx-auto max-w-6xl px-gutter py-8">{s ? (
          canOpen(s.role, pathname) ? children : <Card><p className="text-body-md text-ink">This page isn&apos;t available for your level.</p></Card>
        ) : null}</div>
      </main>
    </div>
  );
}
