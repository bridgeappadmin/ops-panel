'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CampaignStatusPill } from '@/components/CampaignStatusPill';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { History } from '@/components/History';
import { Button, Card, Field, Skeleton, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { CampaignDetail } from '@/lib/types';

export default function CampaignPage() {
  return <AppShell title="Campaign"><Campaign /></AppShell>;
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

  if (error && !detail) return <p role="alert" className="text-danger">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { campaign, brand, applicationCounts, jobs, reports, history } = detail;

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-h3">{campaign.title}</h2>
            <p className="text-body text-ink-muted">
              {brand ? <Link href={`/brands/${brand._id}`} className="text-violet hover:underline">{brand.name}</Link> : 'Deleted account'}
              {campaign.city ? ` · ${campaign.city}` : ''}
            </p>
            <p className="text-caption text-ink-muted">Created {formatIstDateTime(campaign.createdAt)}</p>
          </div>
          <CampaignStatusPill status={campaign.status} />
        </div>
        {campaign.about ? <p className="mt-3 text-body">{campaign.about}</p> : null}
        {campaign.adminClosed ? <p className="mt-3 text-body">Closed by Tazmify: {campaign.adminClosed.reason}</p> : null}
        {isAdmin ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {campaign.status === 'active' ? <Button variant="danger" size="sm" onClick={() => setDialog('close')}>Close campaign</Button> : null}
            {campaign.status === 'closed' && campaign.adminClosed ? <Button variant="secondary" size="sm" onClick={() => setDialog('reopen')}>Reopen</Button> : null}
          </div>
        ) : null}
        {dialog === 'close' ? <CloseDialog onSubmit={close} onClose={() => setDialog(null)} /> : null}
        <ConfirmDialog open={dialog === 'reopen'} title="Reopen campaign?" confirmLabel="Reopen" loading={busy} onConfirm={reopen} onClose={() => { if (!busy) setDialog(null); }} />
      </Card>
      <div className="grid gap-5 sm:grid-cols-4">
        {(['pending', 'accepted', 'rejected', 'hired'] as const).map((k) => (
          <Card key={k}><p className="text-caption-sb capitalize text-ink-muted">{k}</p><p className="font-display text-h2">{applicationCounts[k]}</p></Card>
        ))}
      </div>
      <Card padded={false}>
        <h2 className="px-4 pt-4 font-display text-h3">Jobs</h2>
        {jobs.length === 0 ? <p className="p-4 text-ink-muted">No jobs yet.</p> : (
          <Table>
            <thead><tr><Th>Creator</Th><Th>Status</Th><Th>Created</Th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j._id}>
                  <Td>{j.creator ? <Link href={`/creators/${j.creator._id}`} className="text-violet hover:underline">{j.creator.name}</Link> : 'Deleted account'}</Td>
                  <Td><CampaignStatusPill status={j.status} /></Td><Td className="whitespace-nowrap">{formatIstDateTime(j.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
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
