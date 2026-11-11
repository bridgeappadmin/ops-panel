'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CampaignStatusPill } from '@/components/CampaignStatusPill';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { History, Reports } from '@/components/History';
import { Button, Card, Field, Skeleton, Stats, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { CampaignDetail } from '@/lib/types';

export default function CampaignPage() {
  return <AppShell title="Campaign" hideTitle><Campaign /></AppShell>;
}

/** Mounted only while open. `onSubmit` answers the server's refusal ('' when it went through; the parent then closes it). */
function CloseDialog({ onSubmit, onClose }: { onSubmit: (reason: string) => Promise<string>; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  async function confirm() {
    if (sending.current) return;
    const r = reason.trim();
    if (r.length < 3 || r.length > 300) { setError('Reason must be 3-300 characters'); return; }
    sending.current = true;
    setBusy(true);
    setError('');
    try { setError(await onSubmit(r)); } finally { sending.current = false; setBusy(false); }
  }

  return (
    <ConfirmDialog open title="Close campaign" confirmLabel="Close campaign" danger loading={busy} onConfirm={confirm} onClose={() => { if (!sending.current) onClose(); }}>
      <Field area label="Shown to the brand" value={reason} maxLength={300} error={error} onChange={(e) => setReason(e.target.value)} />
    </ConfirmDialog>
  );
}

function Campaign() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useSession()?.role === 'superadmin';
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<'close' | 'reopen' | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<CampaignDetail>(`/admin/campaigns/${id}`).then(
    (d) => { setDetail(d); setError(''); }, (e: Error) => setError(e.message)), [id]);
  useEffect(() => { load(); }, [load]);

  async function close(reason: string) {
    try { await api(`/admin/campaigns/${id}/close`, { method: 'POST', body: { reason } }); } catch (e) { return (e as Error).message; }
    setDialog(null);
    load();
    return '';
  }
  async function reopen() {
    setBusy(true);
    try { await api(`/admin/campaigns/${id}/reopen`, { method: 'POST' }); setError(''); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); setDialog(null); }
  }

  if (error && !detail) return <p role="alert" className="text-danger-ink">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { campaign, brand, applicationCounts, jobs, reports, history } = detail;
  const details: [string, string][] = [
    ['Niche', campaign.niche ?? ''],
    ['Budget', campaign.budgetMin != null || campaign.budgetMax != null ? `₹${formatNumber(campaign.budgetMin ?? 0)} to ₹${formatNumber(campaign.budgetMax ?? 0)}` : ''],
    ['Dates', campaign.startDate ? `${formatIstDateTime(campaign.startDate)}${campaign.endDate ? ` to ${formatIstDateTime(campaign.endDate)}` : ''}` : ''],
    ['Where', [campaign.city, campaign.pincode].filter(Boolean).join(' ')],
    ['Deliverables', campaign.deliverables?.join(', ') ?? ''],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="space-y-6">
      {error ? <p role="alert" className="text-danger-ink">{error}</p> : null}
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-5 p-6">
          <div className="min-w-0 flex-1 basis-72">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-display text-h1">{campaign.title}</h1>
              <CampaignStatusPill status={campaign.status} />
            </div>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-muted">
              {brand ? <Link href={`/brands/${brand._id}`} className="font-semibold text-violet-pressed hover:underline">{brand.name}</Link> : <span>Deleted account</span>}
              {campaign.city ? <span>{campaign.city}</span> : null}
              <span>Created {formatIstDateTime(campaign.createdAt)}</span>
            </p>
          </div>
          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              {campaign.status === 'active' ? <Button variant="danger" size="sm" onClick={() => setDialog('close')}>Close campaign</Button> : null}
              {campaign.status === 'closed' && campaign.adminClosed ? <Button variant="secondary" size="sm" onClick={() => setDialog('reopen')}>Reopen</Button> : null}
            </div>
          ) : null}
        </div>
        {campaign.adminClosed ? <p className="border-t border-line bg-cloud px-6 py-3">Closed by Tazmify: {campaign.adminClosed.reason}</p> : null}
        {dialog === 'close' ? <CloseDialog onSubmit={close} onClose={() => setDialog(null)} /> : null}
        <ConfirmDialog open={dialog === 'reopen'} title="Reopen campaign?" confirmLabel="Reopen" loading={busy} onConfirm={reopen} onClose={() => { if (!busy) setDialog(null); }} />
      </Card>
      <Stats items={(['pending', 'accepted', 'rejected', 'hired'] as const).map((k) => ({ label: `${k[0].toUpperCase()}${k.slice(1)} applications`, value: applicationCounts[k] }))} />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {campaign.about ? (
            <Card>
              <h2 className="font-display text-h4">About</h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-muted">{campaign.about}</p>
            </Card>
          ) : null}
          <Card padded={false}>
            <h2 className="p-6 pb-4 font-display text-h4">Jobs</h2>
            {jobs.length === 0 ? <p className="px-6 pb-6 text-ink-muted">No jobs yet.</p> : (
              <Table>
                <thead><tr><Th>Creator</Th><Th>Status</Th><Th>Created</Th></tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j._id}>
                      <Td>{j.creator ? <Link href={`/creators/${j.creator._id}`} className="font-semibold text-ink hover:text-violet-pressed">{j.creator.name}</Link> : 'Deleted account'}</Td>
                      <Td><CampaignStatusPill status={j.status} /></Td><Td className="whitespace-nowrap text-ink-muted">{formatIstDateTime(j.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Reports rows={reports} subject="this campaign" />
        </div>
        <div className="space-y-6">
          {details.length ? (
            <Card>
              <h2 className="font-display text-h4">Details</h2>
              <dl className="mt-3 divide-y divide-line">
                {details.map(([k, v]) => <div key={k} className="py-2.5"><dt className="text-caption text-ink-muted">{k}</dt><dd className="break-words">{v}</dd></div>)}
              </dl>
            </Card>
          ) : null}
          <History rows={history} />
        </div>
      </div>
    </div>
  );
}
