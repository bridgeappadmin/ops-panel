'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { canOpen, homeFor, ROLE_LABEL, SECTIONS, sectionFor, type Section } from '@/lib/roles';
import { session, useSession } from '@/lib/session';
import { Avatar, Card, Icon, LogoLockup, type IconName } from './ui';

const ICON: Record<string, IconName> = {
  '/dashboard': 'dashboard', '/creators': 'users', '/brands': 'store', '/campaigns': 'megaphone', '/jobs': 'briefcase',
  '/moderation': 'shield', '/tickets': 'message', '/offers': 'tag', '/vouchers': 'ticket', '/reports': 'chart',
  '/settings': 'sliders', '/notifications': 'send', '/team': 'idCard',
};

/**
 * Every signed-in page: the sidebar (the level's sections, the admin's name and Sign out), a top bar with the
 * breadcrumb and Jump to, then the page title and the page. A page outside the signed-in level's sections renders
 * a card instead of children, so its fetches never run. `hideTitle` is for detail pages, whose header card holds the h1.
 * Without a session (signed out, or a 401 cleared it) it sends you to /login and renders no page, so nothing
 * more is fetched.
 */
export function AppShell({ title, description, actions, hideTitle = false, children }: {
  title: string; description?: string; actions?: ReactNode; hideTitle?: boolean; children: ReactNode;
}) {
  const s = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Reads storage itself: `s` is null during hydration even when signed in.
  useEffect(() => {
    if (!session.get()) router.replace('/login');
  }, [s, router]);

  const sections = s ? SECTIONS.filter((item) => item.roles.includes(s.role)) : [];
  const groups = [...new Set(sections.map((item) => item.group))];
  const current = sectionFor(pathname);
  const allowed = s ? canOpen(s.role, pathname) : false;

  return (
    <div className="min-h-screen lg:flex">
      {/* The outer column stretches to the page's height so the dark band never ends; the sidebar inside stays put while the page scrolls. */}
      <div className={`${menuOpen ? 'block' : 'hidden'} z-40 bg-sidebar max-lg:fixed max-lg:inset-0 lg:block lg:w-64 lg:shrink-0`}>
      <aside className="flex h-full flex-col lg:sticky lg:top-0 lg:h-screen">
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <Link href={s ? homeFor(s.role) : '/login'}><LogoLockup tone="onInk" markSize={24} /></Link>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="inline-flex size-10 items-center justify-center rounded-sm text-sidebar-text hover:bg-white/6 lg:hidden">
            <Icon name="close" />
          </button>
        </div>
        {s ? (
          <>
            <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
              {groups.map((group) => (
                <div key={group}>
                  <p className="mb-1.5 px-3 text-micro font-semibold uppercase text-sidebar-muted">{group}</p>
                  <ul className="space-y-0.5">
                    {sections.filter((item) => item.group === group).map((item) => {
                      const active = current?.href === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setMenuOpen(false)}
                            className={`flex h-10 items-center gap-3 rounded-sm px-3 text-body-md transition-colors outline-lavender focus-visible:outline-2 ${active ? 'bg-violet/30 text-white' : 'text-sidebar-text hover:bg-white/6 hover:text-white'}`}
                          >
                            <Icon name={ICON[item.href]} />{item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="flex items-center gap-3 border-t border-white/8 px-5 py-4">
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-small-sb text-white">{s.name}</p>
                <p className="text-caption text-sidebar-muted">{ROLE_LABEL[s.role]}</p>
              </div>
              <button type="button" aria-label="Sign out" title="Sign out" onClick={() => session.clear()} className="inline-flex size-10 items-center justify-center rounded-sm text-sidebar-text transition-colors outline-lavender hover:bg-white/6 hover:text-white focus-visible:outline-2">
                <Icon name="logout" />
              </button>
            </div>
          </>
        ) : null}
      </aside>
      </div>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="-ml-2 inline-flex size-10 items-center justify-center rounded-sm text-ink hover:bg-mist lg:hidden">
            <Icon name="menu" />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-small text-ink-muted">
            {current ? <span className="hidden whitespace-nowrap sm:inline">{current.group}</span> : null}
            {current ? <Icon name="chevronRight" size={14} className="hidden sm:block" /> : null}
            {current && pathname !== current.href ? (
              <>
                <Link href={current.href} className="whitespace-nowrap hover:text-ink">{current.label}</Link>
                <Icon name="chevronRight" size={14} />
              </>
            ) : null}
            <span aria-current="page" className="truncate font-semibold text-ink">{title}</span>
          </nav>
          {s ? <JumpTo sections={sections} /> : null}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          {hideTitle ? null : (
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display text-hero">{title}</h1>
                {description ? <p className="mt-1.5 max-w-2xl text-body-lg text-ink-muted">{description}</p> : null}
              </div>
              {allowed ? actions : null}
            </div>
          )}
          {s ? (
            allowed ? children : <Card><p className="text-body-md text-ink">This page isn&apos;t available for your level.</p></Card>
          ) : null}
        </main>
      </div>
    </div>
  );
}

/** Ctrl/⌘ K, then a section name (the list suggests them) or, for levels with Vouchers, a voucher number. */
function JumpTo({ sections }: { sections: Section[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const vouchers = sections.some((item) => item.href === '/vouchers');
  // Not "voucher number": that is the Vouchers page's own field label.
  const label = vouchers ? 'Jump to a page or voucher' : 'Jump to a page';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(e: FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    const hit = sections.find((item) => item.label.toLowerCase().startsWith(text.toLowerCase()));
    if (hit) router.push(hit.href);
    else if (vouchers && /^tv/i.test(text)) router.push(`/vouchers?number=${encodeURIComponent(text)}`);
    else return;
    setQ('');
    input.current?.blur();
  }

  return (
    <form role="search" onSubmit={go} className="ml-auto hidden w-full max-w-sm sm:block">
      <label className="flex h-10 items-center gap-2.5 rounded-md border border-line bg-cloud px-3 text-ink-muted transition-colors focus-within:border-violet focus-within:bg-white">
        <Icon name="search" size={16} />
        <input ref={input} list="jump-to" value={q} onChange={(e) => setQ(e.target.value)} aria-label={label} placeholder={label}
          className="min-w-0 flex-1 bg-transparent text-small text-ink outline-none placeholder:text-ink-muted" />
        <kbd className="rounded-[6px] border border-line-strong bg-white px-1.5 font-body text-micro text-ink-muted">Ctrl K</kbd>
      </label>
      <datalist id="jump-to">{sections.map((item) => <option key={item.href} value={item.label} />)}</datalist>
    </form>
  );
}
