'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AccountCard } from '@/components/AccountCard';
import { AdjustConnectsDialog } from '@/components/AdjustConnectsDialog';
import { AppShell } from '@/components/AppShell';
import { History } from '@/components/History';
import { Button, Card, Pager, Skeleton, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import type { AccountPage, AdjustConnectsInput, CreatorDetail, LedgerRow } from '@/lib/types';

export default function CreatorPage() {
  return <AppShell title="Creator"><Creator /></AppShell>;
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

  if (error && !detail) return <p role="alert" className="text-danger">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { creator, socials, counts, reports, history, suspension } = detail;

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      <AccountCard
        kind="creator" profile={creator} suspension={suspension} onChanged={loadDetail}
        extra={<Button variant="secondary" size="sm" onClick={() => setAdjusting(true)}>Adjust Connects</Button>}
      />
      {adjusting ? <AdjustConnectsDialog onSubmit={adjust} onClose={() => setAdjusting(false)} /> : null}
      <div className="grid gap-5 sm:grid-cols-3">
        <Card><p className="text-caption-sb text-ink-muted">Connects balance</p><p data-testid="balance" className="font-display text-h2">{formatNumber(creator.connectsBalance ?? 0)}</p></Card>
        <Card><p className="text-caption-sb text-ink-muted">Applications</p><p className="font-display text-h2">{formatNumber(counts.applications)}</p></Card>
        <Card><p className="text-caption-sb text-ink-muted">Jobs</p><p className="font-display text-h2">{formatNumber(counts.jobs)}</p></Card>
      </div>
      <Card>
        <h2 className="font-display text-h3">Socials</h2>
        {socials.length === 0 ? <p className="mt-2 text-ink-muted">No connected accounts.</p> : (
          <ul className="mt-3 space-y-2">
            {socials.map((s) => (
              <li key={`${s.platform}-${s.username}`} className="text-body">
                <span className="text-body-sb capitalize">{s.platform}</span>{' '}
                {s.username ? (s.profileLink && /^https?:\/\//.test(s.profileLink) ? <a href={s.profileLink} target="_blank" rel="noreferrer" className="text-violet hover:underline">@{s.username}</a> : `@${s.username}`) : null}
                {' · '}{formatNumber(s.followers)} followers · {s.engagementRate}% engagement{s.tokenExpired ? ' · token expired' : ''}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card padded={false}>
        <h2 className="px-4 pt-4 font-display text-h3">Connects ledger</h2>
        {ledger && ledger.results.length === 0 ? <p className="p-4 text-ink-muted">No Connects activity.</p> : (
          <Table>
            <thead><tr><Th>When</Th><Th>Type</Th><Th>Amount</Th><Th>Balance after</Th><Th>Reason</Th></tr></thead>
            <tbody>
              {ledger?.results.map((l) => (
                <tr key={l._id}>
                  <Td className="whitespace-nowrap">{formatIstDateTime(l.createdAt)}</Td><Td>{l.type}</Td>
                  <Td>{l.amount > 0 ? `+${l.amount}` : l.amount}</Td><Td>{l.balanceAfter}</Td><Td>{l.reason ?? ''}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {ledger ? <Pager page={ledgerPage} totalPages={ledger.totalPages} onPage={loadLedger} /> : null}
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
