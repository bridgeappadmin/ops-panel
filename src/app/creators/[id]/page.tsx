'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AccountCard } from '@/components/AccountCard';
import { AdjustConnectsDialog } from '@/components/AdjustConnectsDialog';
import { AppShell } from '@/components/AppShell';
import { History, Reports } from '@/components/History';
import { Button, Card, Chip, Icon, Pager, Pill, Skeleton, Stats, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import type { AccountPage, AdjustConnectsInput, CreatorDetail, LedgerRow } from '@/lib/types';

export default function CreatorPage() {
  return <AppShell title="Creator" hideTitle><Creator /></AppShell>;
}

function Creator() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CreatorDetail | null>(null);
  const [ledger, setLedger] = useState<AccountPage<LedgerRow> | null>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadDetail = useCallback(() => api<CreatorDetail>(`/admin/accounts/creators/${id}`).then(
    (d) => { setDetail(d); setError(''); }, (e: Error) => setError(e.message)), [id]);
  const loadLedger = useCallback((page: number) => api<AccountPage<LedgerRow>>(`/admin/accounts/creators/${id}/ledger?page=${page}`).then(
    (l) => { setLedger(l); setLedgerPage(page); }, (e: Error) => setError(e.message)), [id]);
  useEffect(() => {
    api<CreatorDetail>(`/admin/accounts/creators/${id}`).then(setDetail, (e: Error) => setError(e.message));
    api<AccountPage<LedgerRow>>(`/admin/accounts/creators/${id}/ledger?page=1`).then(setLedger, (e: Error) => setError(e.message));
  }, [id]);

  async function adjust(body: AdjustConnectsInput) {
    try { await api(`/admin/accounts/creators/${id}/connects`, { method: 'POST', body }); } catch (e) { return (e as Error).message; }
    setAdjusting(false);
    loadDetail();
    loadLedger(1);
    return '';
  }

  if (error && !detail) return <p role="alert" className="text-danger-ink">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { creator, socials, counts, reports, history, suspension } = detail;

  return (
    <div className="space-y-6">
      {error ? <p role="alert" className="text-danger-ink">{error}</p> : null}
      <AccountCard
        kind="creator" profile={creator} suspension={suspension} onChanged={loadDetail}
        extra={<Button variant="secondary" size="sm" onClick={() => setAdjusting(true)}><Icon name="coins" size={16} />Adjust Connects</Button>}
      />
      {adjusting ? <AdjustConnectsDialog onSubmit={adjust} onClose={() => setAdjusting(false)} /> : null}
      <Stats items={[
        { label: 'Total followers', value: formatNumber(creator.totalFollowers ?? 0) },
        { label: 'Connects balance', value: formatNumber(creator.connectsBalance ?? 0), testId: 'balance' },
        { label: 'Applications', value: formatNumber(counts.applications) },
        { label: 'Jobs', value: formatNumber(counts.jobs) },
      ]} />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="font-display text-h4">Social accounts</h2>
            {socials.length === 0 ? <p className="mt-3 text-ink-muted">No connected accounts.</p> : (
              <ul className="mt-4 space-y-3">
                {socials.map((s) => (
                  <li key={`${s.platform}-${s.username}`} className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md border border-line p-4">
                    <div className="flex min-w-0 flex-1 basis-52 items-center gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-violet-tint text-violet-pressed">
                        <Icon name={s.platform === 'instagram' ? 'instagram' : s.platform === 'youtube' ? 'youtube' : 'users'} size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-body-sb capitalize">{s.platform}</p>
                        <p className="truncate text-small">
                          {s.username ? (s.profileLink && /^https?:\/\//.test(s.profileLink) ? <a href={s.profileLink} target="_blank" rel="noreferrer" className="text-violet-pressed hover:underline">@{s.username}</a> : `@${s.username}`) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-8 tabular-nums">
                      <p><span className="block text-caption text-ink-muted">Followers</span><span className="font-semibold">{formatNumber(s.followers)}</span></p>
                      <p><span className="block text-caption text-ink-muted">Engagement</span><span className="font-semibold">{s.engagementRate}%</span></p>
                    </div>
                    {s.tokenExpired ? <Pill label="Token expired" tone="warning" /> : <Pill label="Connected" tone="success" />}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card padded={false}>
            <div className="p-6 pb-4">
              <h2 className="font-display text-h4">Connects ledger</h2>
              <p className="text-small text-ink-muted">Every credit and debit, newest first</p>
            </div>
            {ledger && ledger.results.length === 0 ? <p className="px-6 pb-6 text-ink-muted">No Connects activity.</p> : (
              <Table>
                <thead><tr><Th>When</Th><Th>Type</Th><Th>Reason</Th><Th className="text-right">Amount</Th><Th className="text-right">Balance after</Th></tr></thead>
                <tbody>
                  {ledger?.results.map((l) => (
                    <tr key={l._id}>
                      <Td className="whitespace-nowrap text-ink-muted">{formatIstDateTime(l.createdAt)}</Td>
                      <Td><span className="rounded-[6px] bg-mist px-2 py-0.5 text-caption-sb text-ink-muted">{l.type}</span></Td>
                      <Td>{l.reason ?? ''}</Td>
                      <Td className={`text-right font-semibold ${l.amount > 0 ? 'text-success-ink' : ''}`}>{l.amount > 0 ? `+${l.amount}` : l.amount}</Td>
                      <Td className="text-right text-ink-muted">{l.balanceAfter}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {ledger ? <Pager page={ledgerPage} totalPages={ledger.totalPages} onPage={loadLedger} /> : null}
          </Card>
          <Reports rows={reports} subject="this creator" />
        </div>
        <div className="space-y-6">
          {creator.bio || creator.niches?.length ? (
            <Card>
              <h2 className="font-display text-h4">About</h2>
              {creator.bio ? <p className="mt-3 whitespace-pre-wrap text-ink-muted">{creator.bio}</p> : null}
              {creator.niches?.length ? <div className="mt-4 flex flex-wrap gap-2">{creator.niches.map((n) => <Chip key={n} label={n} />)}</div> : null}
            </Card>
          ) : null}
          <History rows={history} />
        </div>
      </div>
    </div>
  );
}
