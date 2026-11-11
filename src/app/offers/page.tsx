'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { OfferStatusPill } from '@/components/OfferStatusPill';
import { Card, Icon, Skeleton, Table, Tabs, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import { fundedByLabel } from '@/lib/offers';
import type { Budget, OfferPage, OfferStatus } from '@/lib/types';

const FILTERS: { label: string; value: '' | OfferStatus }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Ended', value: 'ended' },
];

export default function OffersPage() {
  return (
    <AppShell
      title="Offers"
      description="Venue offers creators claim with Connects. Open one to pause it, add coupons or refund a voucher."
      actions={
        <Link href="/offers/new" className="inline-flex h-11 items-center gap-2 rounded-md bg-violet px-4.5 text-body-sb text-white shadow-violet hover:bg-violet-pressed">
          <Icon name="plus" size={16} />New offer
        </Link>
      }
    >
      <Offers />
    </AppShell>
  );
}

function Offers() {
  const [status, setStatus] = useState<'' | OfferStatus>('');
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetError, setBudgetError] = useState('');
  const [offers, setOffers] = useState<OfferPage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Budget>('/admin/budget').then(setBudget, (e: Error) => setBudgetError(e.message));
  }, []);
  useEffect(() => {
    let current = true;
    api<OfferPage>(`/admin/offers${status ? `?status=${status}` : ''}`).then(
      (page) => { if (current) { setOffers(page); setError(''); } },
      (e: Error) => { if (current) setError(e.message); },
    );
    return () => { current = false; };
  }, [status]);

  const pct = budget?.capConnects ? Math.min(100, Math.round((budget.usedConnects / budget.capConnects) * 100)) : 0;
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-small-md text-ink-muted">Tazmify-funded budget</p>
          {budget ? (
            <p className="mt-1 text-body-md">Tazmify-funded this month: {formatNumber(budget.usedConnects)} / {formatNumber(budget.capConnects)} Connects</p>
          ) : budgetError ? (
            <p role="alert" className="mt-1 text-danger-ink">{budgetError}</p>
          ) : (
            <Skeleton className="mt-1 h-5 w-80" />
          )}
        </div>
        {budget ? (
          <div className="flex w-full items-center gap-4 sm:w-72">
            <span role="progressbar" aria-label="Tazmify-funded Connects used" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="block h-2 flex-1 overflow-hidden rounded-pill bg-violet-tint">
              <span className={`block h-full rounded-pill ${pct >= 90 ? 'bg-danger' : 'bg-violet'}`} style={{ width: `${pct}%` }} />
            </span>
            <span className="font-display text-h3 tabular-nums">{pct}%</span>
          </div>
        ) : null}
      </Card>
      <Card padded={false}>
        <div className="border-b border-line px-5">
          <Tabs label="Filter by status" options={FILTERS} value={status} onChange={(v) => { setOffers(null); setStatus(v); }} />
        </div>
        {error ? <p role="alert" className="px-5 pt-4 text-danger-ink">{error}</p> : null}
        {offers === null ? (
          !error && <div className="p-5"><Skeleton className="h-32 w-full" /></div>
        ) : offers.results.length === 0 ? (
          <p className="px-5 py-14 text-center text-ink-muted">No offers yet.</p>
        ) : (
          <Table>
            <thead><tr>{['Venue', 'Title', 'Status', 'Coupons left', 'Funded by', 'Dates'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {offers.results.map((o) => (
                <tr key={o._id}>
                  <Td>
                    <div className="font-semibold">{o.venue?.name ?? '—'}</div>
                    {o.venue?.city ? <div className="text-small text-ink-muted">{o.venue.city}</div> : null}
                  </Td>
                  <Td><Link href={`/offers/${o._id}`} className="font-medium text-violet-pressed hover:underline">{o.title}</Link></Td>
                  <Td><OfferStatusPill offer={o} /></Td>
                  <Td>{formatNumber(o.remainingCoupons)} / {formatNumber(o.totalCoupons)}</Td>
                  <Td>{fundedByLabel(o.fundedBy)}</Td>
                  <Td className="whitespace-nowrap text-ink-muted">{formatIstDateTime(o.startsAt)} to {formatIstDateTime(o.endsAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
