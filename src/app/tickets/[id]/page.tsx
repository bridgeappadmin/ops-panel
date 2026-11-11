'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { History } from '@/components/History';
import { TICKET_STATUSES, TicketStatusPill } from '@/components/TicketStatusPill';
import { Button, Card, Chip, Field, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import type { TicketDetail, TicketStatus, TicketView } from '@/lib/types';

export default function TicketPage() {
  return <AppShell title="Support ticket"><Ticket /></AppShell>;
}

function Ticket() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    api<TicketDetail>(`/admin/tickets/${id}`).then((d) => { setDetail(d); setError(''); }, (e: Error) => setError(e.message));
  }, [id]);

  // One request at a time for the status chips and the note button.
  async function send(request: () => Promise<{ ticket: TicketView }>, after?: () => void) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const { ticket } = await request();
      setDetail((d) => (d ? { ...d, ticket } : d));
      setError('');
      after?.();
    } catch (e) { setError((e as Error).message); } finally { sending.current = false; setBusy(false); }
  }
  const setStatus = (status: TicketStatus) => send(() => api(`/admin/tickets/${id}`, { method: 'PATCH', body: { status } }));
  const addNote = () => {
    const text = note.trim();
    if (text) send(() => api(`/admin/tickets/${id}/notes`, { method: 'POST', body: { text } }), () => setNote(''));
  };

  if (error && !detail) return <p role="alert" className="text-danger">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { ticket, user, history } = detail;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-h3">{ticket.subject}</h2>
            <p className="text-body text-ink-muted">
              {user ? <Link href={`/${user.role === 'brand' ? 'brands' : 'creators'}/${user._id}`} className="text-violet hover:underline">{user.name}</Link> : 'Deleted account'}
              {user?.email ? ` · ${user.email}` : ''}{user?.phoneNumber ? ` · ${user.phoneNumber}` : ''}
            </p>
            <p className="text-caption text-ink-muted">Opened {formatIstDateTime(ticket.createdAt)}</p>
          </div>
          <TicketStatusPill status={ticket.status} />
        </div>
        <p className="mt-3 whitespace-pre-wrap text-body">{ticket.description}</p>
        {ticket.attachments?.length ? (
          <ul aria-label="Attachments" className="mt-2 space-y-1 text-caption">
            {ticket.attachments.map((url, i) => (
              <li key={i}>
                {/^https?:\/\//.test(url)
                  ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">Attachment {i + 1}</a>
                  : <span className="break-all text-ink-muted">{url}</span>}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Status">
          {TICKET_STATUSES.map((s) => <Chip key={s.value} size="sm" label={s.label} selected={ticket.status === s.value} onClick={() => setStatus(s.value)} />)}
        </div>
        {error ? <p role="alert" className="mt-3 text-danger">{error}</p> : null}
      </Card>
      <Card>
        <h2 className="font-display text-h3">Notes</h2>
        {ticket.notes.length === 0 ? <p className="mt-2 text-ink-muted">No notes yet.</p> : (
          <ul className="mt-3 space-y-3">
            {ticket.notes.map((n, i) => (
              <li key={i}>
                <p className="whitespace-pre-wrap text-body">{n.text}</p>
                <p className="text-caption text-ink-muted">{n.admin?.name ?? 'Former admin'} · {formatIstDateTime(n.at)}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 space-y-2">
          <Field area label="Note" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" loading={busy} disabled={!note.trim()} onClick={addNote}>Add note</Button>
        </div>
      </Card>
      <History rows={history} />
    </div>
  );
}
