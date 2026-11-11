'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AccountCard } from '@/components/AccountCard';
import { AppShell } from '@/components/AppShell';
import { History } from '@/components/History';
import { Card, Pill, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import type { BrandDetail } from '@/lib/types';

export default function BrandPage() {
  return <AppShell title="Brand"><Brand /></AppShell>;
}

function Brand() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<BrandDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api<BrandDetail>(`/admin/accounts/brands/${id}`).then(
    (d) => { setDetail(d); setError(''); }, (e: Error) => setError(e.message)), [id]);
  useEffect(() => {
    api<BrandDetail>(`/admin/accounts/brands/${id}`).then(setDetail, (e: Error) => setError(e.message));
  }, [id]);

  if (error && !detail) return <p role="alert" className="text-danger">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { brand, campaigns, reviews, reports, history, suspension } = detail;

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      <AccountCard kind="brand" profile={brand} suspension={suspension} onChanged={load} />
      <Card>
        <h2 className="font-display text-h3">Campaigns</h2>
        {campaigns.length === 0 ? <p className="mt-2 text-ink-muted">No campaigns.</p> : (
          <ul className="mt-3 space-y-2">
            {campaigns.map((c) => <li key={c._id} className="flex items-center gap-2 text-body">{c.title} <Pill label={c.status} /> <span className="text-caption text-ink-muted">{formatIstDateTime(c.createdAt)}</span></li>)}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="font-display text-h3">Reviews</h2>
        <p className="mt-2 text-body">{reviews.count === 0 ? 'No reviews yet.' : `${reviews.count} reviews, average ${reviews.average.toFixed(1)}`}</p>
        <ul className="mt-3 space-y-2">
          {reviews.latest.map((r) => <li key={r._id} className="text-body">{r.overallRating}/5{r.comment ? ` · ${r.comment}` : ''}</li>)}
        </ul>
      </Card>
      {reports.length ? (
        <Card>
          <h2 className="font-display text-h3">Reports</h2>
          <ul className="mt-3 space-y-1">{reports.map((r) => <li key={r._id} className="text-body">{r.reason} · {r.status}{r.resolution ? ` (${r.resolution})` : ''}</li>)}</ul>
        </Card>
      ) : null}
      <History rows={history} />
    </div>
  );
}
