'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { OfferStatusPill } from '@/components/OfferStatusPill';
import { Card, Chip, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import { fundedByLabel } from '@/lib/offers';
import type { Budget, OfferPage, OfferStatus } from '@/lib/types';

const FILTERS: { label: string; status: '' | OfferStatus }[] = [
  { label: 'All', status: '' },
  { label: 'Active', status: 'active' },
  { label: 'Paused', status: 'paused' },
  { label: 'Ended', status: 'ended' },
];

export default function OffersPage() {
  return (
    <AppShell
      title="Offers"
      actions={
        <Link href="/offers/new" className="inline-flex h-14 items-center rounded-lg bg-violet px-4.5 font-display text-h5 text-white shadow-violet hover:bg-violet-pressed">
          New offer
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

  return (
    <div className="space-y-5">
      <Card>
        {budget ? (
          <p className="text-body-md">
            Tazmify-funded this month: {formatNumber(budget.usedConnects)} / {formatNumber(budget.capConnects)} Connects
          </p>
        ) : budgetError ? (
          <p role="alert" className="text-danger">{budgetError}</p>
        ) : (
          <Skeleton className="h-5 w-80" />
        )}
      </Card>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Chip key={f.label} label={f.label} selected={status === f.status} onClick={() => { setOffers(null); setStatus(f.status); }} />
        ))}
      </div>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      {offers === null ? (
        !error && <Skeleton className="h-40 w-full" />
      ) : offers.results.length === 0 ? (
        <Card><p className="text-ink-muted">No offers yet.</p></Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead className="text-caption-sb text-ink-muted">
                <tr>
                  {['Venue', 'Title', 'Status', 'Coupons left', 'Funded by', 'Dates'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offers.results.map((o) => (
                  <tr key={o._id} className="border-t border-line align-top">
                    <td className="px-4 py-3">
                      <div>{o.venue?.name ?? '—'}</div>
                      {o.venue?.city ? <div className="text-caption text-ink-muted">{o.venue.city}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/offers/${o._id}`} className="text-violet hover:underline">{o.title}</Link>
                    </td>
                    <td className="px-4 py-3"><OfferStatusPill offer={o} /></td>
                    <td className="px-4 py-3">{formatNumber(o.remainingCoupons)} / {formatNumber(o.totalCoupons)}</td>
                    <td className="px-4 py-3">{fundedByLabel(o.fundedBy)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatIstDateTime(o.startsAt)} to {formatIstDateTime(o.endsAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
