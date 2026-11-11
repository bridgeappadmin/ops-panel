'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SuspendDialog } from '@/components/SuspendDialog';
import { Avatar, Button, Card, Pill } from '@/components/ui';
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
 * An account's header card (the page's h1) with its suspension state. Only Admin (superadmin) gets the buttons, and never on a deleted
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

  const meta = [profile.username && `@${profile.username}`, profile.email, profile.phoneNumber, profile.city].filter(Boolean) as string[];
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center gap-5 p-6">
        <Avatar name={profile.name ?? 'Unnamed'} src={profile.profilePicture} size={64} />
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-h1">{profile.name ?? 'Unnamed'}</h1>
            {profile.verified ? <Pill label="Verified" tone="violet" /> : null}
            <StatusPill status={status} />
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-muted">
            {meta.map((m) => <span key={m} className="break-all">{m}</span>)}
            <span>Joined {formatIstDateTime(profile.createdAt)}</span>
          </p>
        </div>
        {canAct ? (
          <div className="flex flex-wrap gap-2">
            {extra}
            {suspension.admin ? <Button variant="secondary" size="sm" onClick={() => setDialog('unsuspend')}>Unsuspend</Button> : !suspension.reportId ? <Button variant="danger" size="sm" onClick={() => setDialog('suspend')}>Suspend</Button> : null}
          </div>
        ) : null}
      </div>
      {suspension.admin || suspension.reportId || notice ? (
        <div className="space-y-1 border-t border-line bg-cloud px-6 py-3">
          {suspension.admin ? <p>Suspended by {suspension.admin.by?.name ?? 'an admin'} on {formatIstDateTime(suspension.admin.at)}: {suspension.admin.reason}</p> : null}
          {suspension.reportId ? <p>Suspended by a user report — lift it from Moderation</p> : null}
          {notice ? <p role={notice.tone === 'error' ? 'alert' : 'status'} className={notice.tone === 'success' ? 'text-success-ink' : 'text-danger-ink'}>{notice.text}</p> : null}
        </div>
      ) : null}
      {dialog === 'suspend' ? <SuspendDialog kind={kind} onSubmit={suspend} onClose={() => setDialog(null)} /> : null}
      <ConfirmDialog open={dialog === 'unsuspend'} title={`Unsuspend ${kind}?`} confirmLabel="Unsuspend" loading={busy} onConfirm={unsuspend} onClose={() => { if (!busy) setDialog(null); }} />
    </Card>
  );
}
