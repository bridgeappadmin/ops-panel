'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { History } from '@/components/History';
import { TICKET_STATUSES, TicketStatusPill } from '@/components/TicketStatusPill';
import { Avatar, Button, Card, Chip, Field, Icon, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import type { TicketDetail, TicketStatus, TicketView } from '@/lib/types';

export default function TicketPage() {
  return <AppShell title="Support ticket" hideTitle><Ticket /></AppShell>;
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

  if (error && !detail) return <p role="alert" className="text-danger-ink">{error}</p>;
  if (!detail) return <Skeleton className="h-40 w-full" />;
  const { ticket, user, history } = detail;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-h1">{ticket.subject}</h1>
          <TicketStatusPill status={ticket.status} />
        </div>
        <p className="mt-1.5 text-small text-ink-muted">Opened {formatIstDateTime(ticket.createdAt)} by a {ticket.userRole}</p>
      </Card>
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="font-display text-h4">Message</h2>
            <p className="mt-3 whitespace-pre-wrap break-words">{ticket.description}</p>
            {ticket.attachments?.length ? (
              <ul aria-label="Attachments" className="mt-4 flex flex-wrap gap-2 text-small">
                {ticket.attachments.map((url, i) => (
                  <li key={i}>
                    {/^https?:\/\//.test(url)
                      ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-sm border border-line px-3 py-1.5 font-semibold text-violet-pressed hover:bg-cloud">Attachment {i + 1}</a>
                      : <span className="break-all text-ink-muted">{url}</span>}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
          <Card>
            <h2 className="font-display text-h4">Notes</h2>
            <p className="text-small text-ink-muted">Only the team sees these</p>
            {ticket.notes.length === 0 ? <p className="mt-4 text-ink-muted">No notes yet.</p> : (
              <ul className="mt-4 space-y-3">
                {ticket.notes.map((n, i) => (
                  <li key={i} className="rounded-md bg-cloud p-4">
                    <p className="whitespace-pre-wrap break-words">{n.text}</p>
                    <p className="mt-1 text-caption text-ink-muted">{n.admin?.name ?? 'Former admin'} · {formatIstDateTime(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 space-y-3 border-t border-line pt-5">
              <Field area label="Note" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" loading={busy} disabled={!note.trim()} onClick={addNote}>Add note</Button>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-h4">Status</h2>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Status">
              {TICKET_STATUSES.map((st) => <Chip key={st.value} label={st.label} selected={ticket.status === st.value} onClick={() => setStatus(st.value)} />)}
            </div>
            {error ? <p role="alert" className="mt-3 text-danger-ink">{error}</p> : null}
          </Card>
          <Card>
            <h2 className="font-display text-h4">From</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={user?.name ?? 'Deleted account'} />
              <div className="min-w-0">
                {user ? <Link href={`/${user.role === 'brand' ? 'brands' : 'creators'}/${user._id}`} className="font-semibold text-ink hover:text-violet-pressed">{user.name}</Link> : <span className="font-semibold">Deleted account</span>}
                <p className="text-small capitalize text-ink-muted">{ticket.userRole}</p>
              </div>
            </div>
            {user?.email || user?.phoneNumber ? (
              <dl className="mt-4 space-y-1.5 text-small">
                {user.email ? <div className="flex gap-2"><dt className="sr-only">Email</dt><Icon name="mail" size={16} className="mt-0.5 text-ink-muted" /><dd className="break-all">{user.email}</dd></div> : null}
                {user.phoneNumber ? <div className="flex gap-2"><dt className="sr-only">Phone</dt><Icon name="phone" size={16} className="mt-0.5 text-ink-muted" /><dd>{user.phoneNumber}</dd></div> : null}
              </dl>
            ) : null}
          </Card>
          <History rows={history} />
        </div>
      </div>
    </div>
  );
}
