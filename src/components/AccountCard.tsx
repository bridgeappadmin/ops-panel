'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SuspendDialog } from '@/components/SuspendDialog';
import { Button, Card, Pill } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { AccountProfile, AccountStatus, SuspensionView } from '@/lib/types';

const TONE = { active: 'success', suspended: 'warning', deleted: 'neutral' } as const;
const LABEL: Record<AccountStatus, string> = { active: 'Active', suspended: 'Suspended', deleted: 'Deleted account' };
export const ACCOUNT_FILTERS = [
  { label: 'All', value: '' }, { label: 'Active', value: 'active' }, { label: 'Suspended', value: 'suspended' }, { label: 'Deleted', value: 'deleted' },
];

export const StatusPill = ({ status }: { status: AccountStatus }) => <Pill label={LABEL[status]} tone={TONE[status]} />;

/**
 * An account's profile card with its suspension state. Only Admin (superadmin) gets the buttons, and never on a deleted
 * account. `extra` renders more buttons (Adjust Connects); `onChanged` reloads the page's data after a write.
 */
export function AccountCard({ kind, profile, suspension, onChanged, extra }: {
  kind: 'creator' | 'brand'; profile: AccountProfile; suspension: SuspensionView; onChanged: () => void; extra?: ReactNode;
}) {
  const role = useSession()?.role;
  const [dialog, setDialog] = useState<'suspend' | 'unsuspend' | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const deleted = Boolean(profile.deletedAccount);
  const canAct = role === 'superadmin' && !deleted;
  const base = `/admin/accounts/${kind}s/${profile._id}`;
  const status: AccountStatus = deleted ? 'deleted' : profile.moderationSuspended || suspension.admin || suspension.reportId ? 'suspended' : 'active';

  async function suspend(reason: string) {
    try { await api(`${base}/suspend`, { method: 'POST', body: { reason } }); } catch (e) { return (e as Error).message; }
    setDialog(null);
    onChanged();
    return '';
  }
  async function unsuspend() {
    setBusy(true);
    setNotice(null);
    try {
      // The server's `msg` goes to the envelope's `message`, which api() drops; `data` keeps the outcome.
      const r = await api<{ stillSuspendedByReport: boolean }>(`${base}/unsuspend`, { method: 'POST' });
      setNotice({ tone: 'success', text: r.stillSuspendedByReport ? 'Panel suspension lifted; a report suspension is still in force' : 'Account unsuspended' });
      onChanged();
    } catch (e) { setNotice({ tone: 'error', text: (e as Error).message }); } finally { setBusy(false); setDialog(null); }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-h3">{profile.name ?? 'Unnamed'}</h2>
          <p className="text-body text-ink-muted">{[profile.username && `@${profile.username}`, profile.email, profile.phoneNumber, profile.city].filter(Boolean).join(' · ')}</p>
          <p className="text-caption text-ink-muted">Joined {formatIstDateTime(profile.createdAt)}</p>
        </div>
        <StatusPill status={status} />
      </div>
      {suspension.admin ? (
        <p className="mt-3 text-body">Suspended by {suspension.admin.by?.name ?? 'an admin'} on {formatIstDateTime(suspension.admin.at)}: {suspension.admin.reason}</p>
      ) : null}
      {suspension.reportId ? <p className="mt-3 text-body">Suspended by a user report — lift it from Moderation</p> : null}
      {notice ? <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-3 ${notice.tone === 'success' ? 'text-success' : 'text-danger'}`}>{notice.text}</p> : null}
      {canAct ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {suspension.admin ? <Button variant="secondary" size="sm" onClick={() => setDialog('unsuspend')}>Unsuspend</Button> : !suspension.reportId ? <Button variant="danger" size="sm" onClick={() => setDialog('suspend')}>Suspend</Button> : null}
          {extra}
        </div>
      ) : null}
      {dialog === 'suspend' ? <SuspendDialog kind={kind} onSubmit={suspend} onClose={() => setDialog(null)} /> : null}
      <ConfirmDialog open={dialog === 'unsuspend'} title={`Unsuspend ${kind}?`} confirmLabel="Unsuspend" loading={busy} onConfirm={unsuspend} onClose={() => { if (!busy) setDialog(null); }} />
    </Card>
  );
}
