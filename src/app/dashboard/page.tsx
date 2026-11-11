'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { SignupChart } from '@/components/SignupChart';
import { Card, Icon, Skeleton, type IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { Budget, Stats } from '@/lib/types';

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" description="What needs you now, and how Tazmify moved over the last 30 days.">
      <Dashboard />
    </AppShell>
  );
}

const TONE = { warning: 'bg-warning-tint text-warning-ink', danger: 'bg-danger-tint text-danger-ink', violet: 'bg-violet-tint text-violet-pressed' };
const CARD_LINK = 'group flex flex-col gap-4 rounded-lg border border-line bg-white p-6 transition-[border-color,box-shadow] hover:border-lavender hover:shadow-card';

function Heading({ id, children, note }: { id?: string; children: ReactNode; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="font-display text-h4">{children}</h2>
      {note ? <span className="text-small text-ink-muted">{note}</span> : null}
    </div>
  );
}

function Badge({ icon, tone }: { icon: IconName; tone: keyof typeof TONE }) {
  return <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-sm ${TONE[tone]}`}><Icon name={icon} /></span>;
}

function Cta({ children }: { children: ReactNode }) {
  return (
    <span className="mt-auto inline-flex items-center gap-1.5 text-small-sb text-violet-pressed">
      {children}<Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}

/** A queue that waits on someone: its count, and a link to work it. */
function Queue({ href, icon, tone, label, value, cta }: { href: string; icon: IconName; tone: keyof typeof TONE; label: string; value: number; cta: string }) {
  return (
    <Link href={href} aria-label={`${label}: ${value}`} className={CARD_LINK}>
      <span className="flex items-center gap-3"><Badge icon={icon} tone={tone} /><span className="text-body-sb">{label}</span></span>
      <span className="font-display text-display tabular-nums">{formatNumber(value)}</span>
      <Cta>{value ? cta : 'All clear'}</Cta>
    </Link>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const pct = budget.capConnects ? Math.min(100, Math.round((budget.usedConnects / budget.capConnects) * 100)) : 0;
  return (
    <Link href="/offers" className={CARD_LINK}>
      <span className="flex items-center gap-3"><Badge icon="tag" tone="violet" /><span className="text-body-sb">Venue budget this month</span></span>
      <span className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-display tabular-nums">{pct}%</span>
        <span className="text-small text-ink-muted">{formatNumber(budget.usedConnects)} of {formatNumber(budget.capConnects)} Connects</span>
      </span>
      <span role="progressbar" aria-label="Tazmify-funded Connects used" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="block h-2 overflow-hidden rounded-pill bg-violet-tint">
        <span className={`block h-full rounded-pill ${pct >= 90 ? 'bg-danger' : 'bg-violet'}`} style={{ width: `${pct}%` }} />
      </span>
      <Cta>See offers</Cta>
    </Link>
  );
}

/** Cumulative sign-ups over the window, as a tiny line: the total climbing. */
function Sparkline({ values, className }: { values: number[]; className: string }) {
  const top = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${30 - (v / top) * 28}`).join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className={`h-10 w-24 shrink-0 ${className}`}>
      <polygon points={`0,32 ${pts} 100,32`} fill="currentColor" opacity={0.1} />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Kpi({ label, value, sub, trend }: { label: string; value: number; sub: ReactNode; trend?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-small-md text-ink-muted">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-hero tabular-nums">{formatNumber(value)}</p>
          <p className="mt-1 text-small text-ink-muted">{sub}</p>
        </div>
        {trend}
      </div>
    </Card>
  );
}

function Meter({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between"><span className="text-ink-muted">{label}</span><span className="font-display text-h2 tabular-nums">{formatNumber(value)}</span></div>
      <div aria-hidden className="h-2.5 overflow-hidden rounded-pill bg-violet-tint"><div className={`h-full rounded-pill ${className}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
    </div>
  );
}

function Shortcut({ href, icon, label, note }: { href: string; icon: IconName; label: string; note: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md px-2 py-2.5 text-ink transition-colors hover:bg-cloud">
      <Badge icon={icon} tone="violet" />
      <span className="min-w-0 flex-1"><span className="block text-body-sb">{label}</span><span className="block text-small text-ink-muted">{note}</span></span>
      <Icon name="chevronRight" size={16} className="text-ink-muted" />
    </Link>
  );
}

function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    api<Stats>('/admin/stats').then(
      (r) => { if (current) setS(r); },
      (e: Error) => { if (current) setError(e.message); },
    );
    // The budget card is a nicety: without it the row just shows the two queues.
    api<Budget>('/admin/budget').then((r) => { if (current) setBudget(r); }, () => {});
    return () => { current = false; };
  }, []);

  if (error) return <p role="alert" className="text-danger-ink">{error}</p>;
  if (!s) return <div className="space-y-6"><Skeleton className="h-44 w-full" /><Skeleton className="h-36 w-full" /><Skeleton className="h-80 w-full" /></div>;

  const running = (k: 'creators' | 'brands') => { let n = 0; return s.signupsByDay.map((d) => (n += d[k])); };
  const perDay = (n: number) => `About ${formatNumber(Math.round(n / 30))} a day`;
  const { earned, spent } = s.connects30d;
  const net = earned - spent;
  const campaigns: [string, number, string][] = [
    ['Draft', s.campaigns.draft, 'bg-line-strong'], ['Active', s.campaigns.active, 'bg-violet'],
    ['Closed', s.campaigns.closed, 'bg-lavender-mid'], ['Completed', s.campaigns.completed, 'bg-violet-deep'],
  ];
  const campaignTotal = campaigns.reduce((n, [, v]) => n + v, 0);
  const jobs: [string, number, string][] = [
    ['Hired', s.jobs.hired, 'bg-violet'], ['In progress', s.jobs.in_progress, 'bg-violet'], ['Completion pending', s.jobs.completion_pending, 'bg-warning'],
    ['Completed', s.jobs.completed, 'bg-violet-deep'], ['Cancelled', s.jobs.cancelled, 'bg-ink-disabled'],
  ];
  const jobTop = Math.max(1, ...jobs.map(([, v]) => v));

  return (
    <div className="space-y-8">
      <section aria-labelledby="attention" className="space-y-4">
        <Heading id="attention">Needs attention</Heading>
        <div className="grid gap-4 md:grid-cols-3">
          <Queue href="/tickets" icon="message" tone="warning" label="Open tickets" value={s.openTickets} cta="Answer the oldest first" />
          <Queue href="/moderation" icon="flag" tone="danger" label="Pending reports" value={s.pendingReports} cta="Review reported content" />
          {budget ? <BudgetCard budget={budget} /> : null}
        </div>
      </section>

      <section aria-labelledby="growth" className="space-y-4">
        <Heading id="growth" note="IST days">Last 30 days</Heading>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Creators" value={s.creators.total} sub={<><b className="font-semibold text-success-ink">{formatNumber(s.creators.new30d)}</b> new</>} trend={<Sparkline values={running('creators')} className="text-violet" />} />
          <Kpi label="Brands" value={s.brands.total} sub={<><b className="font-semibold text-success-ink">{formatNumber(s.brands.new30d)}</b> new</>} trend={<Sparkline values={running('brands')} className="text-violet-deep" />} />
          <Kpi label="Applications sent" value={s.applications30d} sub={perDay(s.applications30d)} />
          <Kpi label="Vouchers redeemed" value={s.vouchersRedeemed30d} sub={perDay(s.vouchersRedeemed30d)} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-5 xl:col-span-2">
          <Heading note="New accounts by IST day">Sign-ups per day</Heading>
          <SignupChart days={s.signupsByDay} />
        </Card>
        <Card className="flex flex-col gap-6">
          <Heading>Connects economy</Heading>
          <Meter label="Earned" value={earned} max={Math.max(earned, spent)} className="bg-violet" />
          <Meter label="Spent" value={spent} max={Math.max(earned, spent)} className="bg-violet-deep" />
          <div className="mt-auto rounded-md bg-page p-4">
            <p className="text-micro font-semibold uppercase text-ink-muted">Net</p>
            <p className={`font-display text-h1 tabular-nums ${net >= 0 ? 'text-success-ink' : 'text-danger-ink'}`}>{net >= 0 ? '+' : '−'}{formatNumber(Math.abs(net))}</p>
            <p className="text-small text-ink-muted">{net >= 0 ? 'More earned than spent, so creator balances are growing.' : 'More spent than earned, so creator balances are shrinking.'}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-5">
          <Heading note={`${formatNumber(campaignTotal)} total`}>Campaigns</Heading>
          <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-pill bg-mist">
            {campaigns.map(([label, v, color]) => (v ? <span key={label} className={color} style={{ flexGrow: v }} /> : null))}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {campaigns.map(([label, v, color]) => (
              <div key={label}>
                <dt className="flex items-center gap-2 text-small text-ink-muted"><i aria-hidden className={`size-2 rounded-[2px] ${color}`} />{label}</dt>
                <dd className="font-display text-h3 tabular-nums">{formatNumber(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="space-y-5">
          <Heading note={`${formatNumber(jobs.reduce((n, [, v]) => n + v, 0))} total`}>Jobs</Heading>
          <dl className="space-y-3">
            {jobs.map(([label, v, color]) => (
              <div key={label} className="grid grid-cols-[9.5rem_1fr] items-center gap-3">
                <dt className="text-small text-ink-muted">{label}</dt>
                <dd className="flex items-center gap-3">
                  <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-pill bg-mist"><span className={`block h-full rounded-pill ${color}`} style={{ width: `${(v / jobTop) * 100}%` }} /></span>
                  <span className="w-10 text-right font-semibold tabular-nums">{formatNumber(v)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="space-y-2">
          <Heading>Shortcuts</Heading>
          <div className="-mx-2 pt-1">
            <Shortcut href="/offers/new" icon="plus" label="New venue offer" note="Coupons, Connects price and dates" />
            <Shortcut href="/vouchers" icon="ticket" label="Look up a voucher" note="Check, cancel or refund by number" />
            <Shortcut href="/notifications" icon="send" label="Send a push" note="To creators, brands or everyone" />
            <Shortcut href="/reports" icon="chart" label="Monthly redemptions" note="Per venue, as CSV for finance" />
          </div>
        </Card>
      </div>
    </div>
  );
}
