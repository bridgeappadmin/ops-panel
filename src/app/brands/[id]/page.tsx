'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AccountCard } from '@/components/AccountCard';
import { AppShell } from '@/components/AppShell';
import { CampaignStatusPill } from '@/components/CampaignStatusPill';
import { History, Reports } from '@/components/History';
import { Card, Skeleton, Stats } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import type { BrandDetail, CampaignStatus } from '@/lib/types';

export default function BrandPage() {
  return <AppShell title="Brand" hideTitle><Brand /></AppShell>;
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

  if (error && !detail) return <p role="alert" className="text-danger-ink">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { brand, campaigns, reviews, reports, history, suspension } = detail;

  return (
    <div className="space-y-6">
      {error ? <p role="alert" className="text-danger-ink">{error}</p> : null}
      <AccountCard kind="brand" profile={brand} suspension={suspension} onChanged={load} />
      <Stats items={[
        { label: 'Campaigns', value: campaigns.length },
        { label: 'Reviews', value: reviews.count },
        { label: 'Average rating', value: reviews.count ? `${reviews.average.toFixed(1)} / 5` : '—' },
      ]} />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="font-display text-h4">Campaigns</h2>
            {campaigns.length === 0 ? <p className="mt-3 text-ink-muted">No campaigns.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {campaigns.map((c) => (
                  <li key={c._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span>
                      <Link href={`/campaigns/${c._id}`} className="block text-body-sb text-ink hover:text-violet-pressed">{c.title}</Link>
                      <span className="block text-caption text-ink-muted">{formatIstDateTime(c.createdAt)}</span>
                    </span>
                    <CampaignStatusPill status={c.status as CampaignStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-h4">Reviews</h2>
            <p className="mt-1 text-small text-ink-muted">{reviews.count === 0 ? 'No reviews yet.' : `${reviews.count} reviews, average ${reviews.average.toFixed(1)}`}</p>
            {reviews.latest.length ? (
              <ul className="mt-3 divide-y divide-line">
                {reviews.latest.map((r) => (
                  <li key={r._id} className="py-3">
                    <p className="text-body-sb">{r.overallRating}/5</p>
                    {r.comment ? <p className="text-ink-muted">{r.comment}</p> : null}
                    <p className="text-caption text-ink-muted">{formatIstDateTime(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
          <Reports rows={reports} subject="this brand" />
        </div>
        <div className="space-y-6">
          {brand.bio ? (
            <Card>
              <h2 className="font-display text-h4">About</h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-muted">{brand.bio}</p>
            </Card>
          ) : null}
          <History rows={history} />
        </div>
      </div>
    </div>
  );
}
