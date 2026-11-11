'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Field, Pager, Pill, Skeleton, Tabs } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { AccountPage, ModerationAction, ModerationReport, ReportPerson } from '@/lib/types';

const FILTERS = [
  { label: 'Pending', value: 'pending' }, { label: 'Reviewing', value: 'reviewing' }, { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' }, { label: 'All', value: 'all' },
];
const LABEL: Record<ModerationAction, string> = { reviewing: 'Reviewing', dismiss: 'Dismiss', warn: 'Warn', hide: 'Hide', restore: 'Restore', suspend: 'Suspend', unsuspend: 'Unsuspend' };

/** What this admin may send for this report (the server still has the last word and its refusal shows inline). */
function actionsFor(r: ModerationReport, isAdmin: boolean): ModerationAction[] {
  if (r.resolution === 'hidden') return isAdmin ? ['restore'] : [];
  if (r.resolution === 'account_suspended') return isAdmin ? ['unsuspend'] : [];
  const base: ModerationAction[] = r.status === 'reviewing' ? ['dismiss', 'warn'] : ['reviewing', 'dismiss', 'warn'];
  if (!isAdmin) return base;
  return [...base, r.targetType === 'profile' ? 'suspend' : 'hide'];
}

function Person({ p }: { p: ReportPerson | null }) {
  if (!p) return <>Deleted account</>;
  return <Link href={`/${p.role === 'brand' ? 'brands' : 'creators'}/${p._id}`} className="font-semibold text-violet-pressed hover:underline">{p.name}</Link>;
}

function ReportCard({ report, isAdmin, onChange }: { report: ModerationReport; isAdmin: boolean; onChange: (r: ModerationReport) => void }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  async function decide(action: ModerationAction) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const body: { action: ModerationAction; note?: string } = { action };
      if (note.trim()) body.note = note.trim();
      const { report: saved } = await api<{ report: Partial<ModerationReport> }>(`/moderation/reports/${report._id}`, { method: 'PATCH', body });
      onChange({ ...report, status: saved.status ?? report.status, resolution: saved.resolution ?? report.resolution });
      setNote(''); // sent with this decision; don't re-send it with the next
    } catch (e) { setError((e as Error).message); } finally { sending.current = false; setBusy(false); }
  }

  const actions = actionsFor(report, isAdmin);
  return (
    <Card>
      <article>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-h4 first-letter:uppercase">{report.reason}</h2>
            <p className="mt-1 text-small text-ink-muted">
              <Person p={report.reporter} /> reported <Person p={report.subject} /> · {report.targetType} · {formatIstDateTime(report.createdAt)}
            </p>
          </div>
          <Pill label={report.status.charAt(0).toUpperCase() + report.status.slice(1)} tone={report.status === 'pending' ? 'warning' : report.status === 'reviewing' ? 'violet' : 'neutral'} />
        </div>
        {report.details ? <p className="mt-4 whitespace-pre-wrap break-words">{report.details}</p> : null}
        {report.snapshot ? <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-cloud p-4 font-body text-small">{report.snapshot}</pre> : null}
        {report.mediaUrl && /^https?:\/\//.test(report.mediaUrl)
          ? <p className="mt-3 text-small"><a href={report.mediaUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-violet-pressed hover:underline">Reported media</a></p> : null}
        {report.resolution !== 'none' ? <p className="mt-3 text-small text-ink-muted">Decision: {report.resolution.replace(/_/g, ' ')}</p> : null}
        {actions.length ? (
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <Field label="Note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => <Button key={a} size="sm" variant={a === 'hide' || a === 'suspend' ? 'danger' : 'secondary'} disabled={busy} onClick={() => decide(a)}>{LABEL[a]}</Button>)}
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-3 text-danger-ink">{error}</p> : null}
      </article>
    </Card>
  );
}

function Queue() {
  const isAdmin = useSession()?.role === 'superadmin';
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AccountPage<ModerationReport> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    api<AccountPage<ModerationReport>>(`/moderation/reports?status=${status}&page=${page}&limit=20`).then(
      (r) => { if (!stale) { setData(r); setError(''); } },
      (e: Error) => { if (!stale) setError(e.message); },
    );
    return () => { stale = true; };
  }, [status, page]);

  // A decided report stays where it is until the next load, so its outcome stays on screen.
  const update = (r: ModerationReport) => setData((d) => d && { ...d, results: d.results.map((x) => (x._id === r._id ? r : x)) });

  return (
    <div className="space-y-4">
      <div className="border-b border-line-strong">
        <Tabs label="Filter by status" options={FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(1); setData(null); }} />
      </div>
      {error ? <p role="alert" className="text-danger-ink">{error}</p> : null}
      {data === null ? (error ? null : <Skeleton className="h-40 w-full" />) : (
        <>
          {data.results.length === 0 ? <Card><p className="py-8 text-center text-ink-muted">Nothing found.</p></Card> : data.results.map((r) => <ReportCard key={r._id} report={r} isAdmin={isAdmin} onChange={update} />)}
          <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => { setPage(p); setData(null); }} />
        </>
      )}
    </div>
  );
}

export default function ModerationPage() {
  return <AppShell title="Moderation" description="Reports from users about profiles, campaigns, media, reviews and messages. Review each one and decide."><Queue /></AppShell>;
}
