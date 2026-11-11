'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SignupChart } from '@/components/SignupChart';
import { Card, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { Stats } from '@/lib/types';

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <Dashboard />
    </AppShell>
  );
}

function Tile({ label, value, sub, href }: { label: string; value: number; sub?: number; href?: string }) {
  const body = (
    <>
      <p className="text-caption-sb text-ink-muted">{label}</p>
      <p className="text-h1 text-ink">{formatNumber(value)}</p>
      {sub !== undefined ? <p className="text-small text-ink-muted"><b className="font-semibold">{formatNumber(sub)}</b> new in 30 days</p> : null}
    </>
  );
  return (
    <Card>
      {href ? <Link href={href} aria-label={`${label}: ${value}`} className="block hover:text-violet">{body}</Link> : body}
    </Card>
  );
}

function Group({ title, items }: { title: string; items: [string, number][] }) {
  return (
    <Card>
      <h2 className="mb-2 text-h5 text-ink">{title}</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-body">
        {items.map(([k, v]) => (
          <div key={k} className="col-span-2 flex justify-between">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-semibold">{formatNumber(v)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    api<Stats>('/admin/stats').then(
      (r) => { if (current) setS(r); },
      (e: Error) => { if (current) setError(e.message); },
    );
    return () => { current = false; };
  }, []);

  if (error) return <p role="alert" className="text-danger">{error}</p>;
  if (!s) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Creators" value={s.creators.total} sub={s.creators.new30d} />
        <Tile label="Brands" value={s.brands.total} sub={s.brands.new30d} />
        <Tile label="Open tickets" value={s.openTickets} href="/tickets" />
        <Tile label="Pending reports" value={s.pendingReports} href="/moderation" />
      </div>
      <Card>
        <h2 className="mb-2 text-h5 text-ink">Sign-ups, last 30 days</h2>
        <SignupChart days={s.signupsByDay} />
      </Card>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Group title="Campaigns" items={[['Draft', s.campaigns.draft], ['Active', s.campaigns.active], ['Closed', s.campaigns.closed], ['Completed', s.campaigns.completed]]} />
        <Group title="Jobs" items={[['Hired', s.jobs.hired], ['In progress', s.jobs.in_progress], ['Completion pending', s.jobs.completion_pending], ['Completed', s.jobs.completed], ['Cancelled', s.jobs.cancelled]]} />
        <Group title="Last 30 days" items={[['Applications', s.applications30d], ['Connects earned', s.connects30d.earned], ['Connects spent', s.connects30d.spent], ['Vouchers redeemed', s.vouchersRedeemed30d]]} />
      </div>
    </div>
  );
}
