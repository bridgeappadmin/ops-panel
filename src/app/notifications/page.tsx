'use client';

import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button, Card, Field, Pager, Pill, Skeleton, Table, Td, Th, type PillTone } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import type { AccountPage, BroadcastAudience, BroadcastRow, BroadcastStatus, SendBroadcastInput } from '@/lib/types';

const AUDIENCES: { value: BroadcastAudience; label: string }[] = [
  { value: 'everyone', label: 'Everyone' }, { value: 'creators', label: 'Creators' }, { value: 'brands', label: 'Brands' },
];
const LABEL = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.label]));
const TONE: Record<BroadcastStatus, PillTone> = { queued: 'neutral', sending: 'violet', sent: 'success', failed: 'danger' };

export default function NotificationsPage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <AppShell title="Push notifications">
      <div className="space-y-5">
        <Compose onSent={() => setRefresh((n) => n + 1)} />
        <History refresh={refresh} />
      </div>
    </AppShell>
  );
}

function Compose({ onSent }: { onSent: () => void }) {
  const [audience, setAudience] = useState<BroadcastAudience>('everyone');
  const [count, setCount] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  // One key per message: made when the form opens, renewed after a success and whenever audience, title or body changes (a changed message must not be swallowed by an earlier request), so a double click posts once and a retry reuses it.
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let stale = false;
    api<{ count: number }>(`/admin/broadcasts/audience?audience=${audience}`).then(
      (r) => { if (!stale) setCount(r.count); },
      (e: Error) => { if (!stale) setError(e.message); },
    );
    return () => { stale = true; };
  }, [audience]);

  async function send() {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      await api('/admin/broadcasts', { method: 'POST', body: { audience, title: title.trim(), body: body.trim(), clientKey } satisfies SendBroadcastInput });
      setTitle(''); setBody(''); setConfirming(false); setClientKey(crypto.randomUUID());
      onSent();
    } catch (e) { setError((e as Error).message); } finally { sending.current = false; setBusy(false); }
  }

  const ready = title.trim().length > 0 && body.trim().length > 0 && count !== null;
  return (
    <Card>
      <h2 className="font-display text-h3">Send a push notification</h2>
      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="audience" className="mb-1.5 block text-caption-sb text-ink">Audience</label>
          <select id="audience" value={audience} onChange={(e) => { setCount(null); setClientKey(crypto.randomUUID()); setAudience(e.target.value as BroadcastAudience); }}
            className="h-13.5 w-full rounded-md border-[1.5px] border-line bg-white px-4 text-body-md text-ink outline-none focus:border-violet sm:w-80">
            {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <p className="mt-1.5 text-caption text-ink-muted">{count === null ? 'Counting…' : `${formatNumber(count)} accounts`}</p>
        </div>
        <Field label="Title" value={title} maxLength={100} onChange={(e) => { setClientKey(crypto.randomUUID()); setTitle(e.target.value); }} />
        <Field area label="Message" value={body} maxLength={300} hint={`${body.length}/300`} onChange={(e) => { setClientKey(crypto.randomUUID()); setBody(e.target.value); }} />
        {error && !confirming ? <p role="alert" className="text-danger">{error}</p> : null}
        <div><Button disabled={!ready} onClick={() => { setError(''); setConfirming(true); }}>Send</Button></div>
      </div>
      <ConfirmDialog open={confirming} title="Send notification" confirmLabel="Send" loading={busy} onConfirm={send} onClose={() => { if (!sending.current) setConfirming(false); }}>
        <p>Send to {count} accounts?</p>
        <p className="mt-2 text-body-sb">{title}</p>
        <p className="text-ink-muted">{body}</p>
        {error ? <p role="alert" className="mt-3 text-danger">{error}</p> : null}
      </ConfirmDialog>
    </Card>
  );
}

function History({ refresh }: { refresh: number }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AccountPage<BroadcastRow> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    api<AccountPage<BroadcastRow>>(`/admin/broadcasts?page=${page}`).then(
      (r) => { if (!stale) { setData(r); setError(''); } },
      (e: Error) => { if (!stale) setError(e.message); },
    );
    return () => { stale = true; };
  }, [page, refresh]);

  if (error) return <p role="alert" className="text-danger">{error}</p>;
  if (!data) return <Skeleton className="h-40 w-full" />;
  return (
    <Card padded={false}>
      <h2 className="px-4 pt-4 font-display text-h3">History</h2>
      {data.results.length === 0 ? <p className="p-4 text-ink-muted">Nothing sent yet.</p> : (
        <Table>
          <thead><tr>{['Title', 'Sent by', 'Audience', 'Recipients', 'Status', 'Sent'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {data.results.map((b) => (
              <tr key={b._id}>
                <Td>{b.title}</Td>
                <Td>{b.admin?.name ?? 'Deleted account'}</Td>
                <Td>{LABEL[b.audience] ?? b.audience}</Td>
                <Td>{formatNumber(b.recipients)}</Td>
                <Td><Pill label={b.status[0].toUpperCase() + b.status.slice(1)} tone={TONE[b.status]} /></Td>
                <Td className="whitespace-nowrap">{formatIstDateTime(b.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
    </Card>
  );
}
