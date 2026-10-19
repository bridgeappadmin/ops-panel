'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button, Card, Field, Pill, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format';
import type { AdminAccount, AdminListResponse, AdminResponse, AdminRole, CreateAdminInput, ResetPasswordInput, UpdateAdminInput } from '@/lib/types';

type Notice = { tone: 'error' | 'success'; text: string };
const PASSWORD_ERROR = 'Password must be 12-200 characters';
const validPassword = (p: string) => p.length >= 12 && p.length <= 200;

export default function AdminsPage() {
  return (
    <AppShell title="Admins">
      <Admins />
    </AppShell>
  );
}

function Admins() {
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState<AdminAccount | null>(null);

  const load = async () => {
    try {
      setAdmins((await api<AdminListResponse>('/admin/admins')).admins);
    } catch (e) { setLoadError((e as Error).message); }
  };
  useEffect(() => {
    api<AdminListResponse>('/admin/admins').then((r) => setAdmins(r.admins), (e: Error) => setLoadError(e.message));
  }, []);

  // Runs one change, then refetches the list; a refusal shows the server's message above the table.
  async function act(run: () => Promise<unknown>, success?: string): Promise<boolean> {
    setNotice(null);
    setBusy(true);
    try {
      await run();
      await load();
      if (success) setNotice({ tone: 'success', text: success });
      return true;
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message });
      return false;
    } finally { setBusy(false); }
  }
  const patch = (a: AdminAccount, body: UpdateAdminInput) => act(() => api(`/admin/admins/${a._id}`, { method: 'PATCH', body }));

  // An ops admin gets the server's 403 message and nothing else: no table, no form.
  if (loadError) return <p role="alert" className="text-danger">{loadError}</p>;
  if (admins === null) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-5">
      {notice ? <p role={notice.tone === 'error' ? 'alert' : 'status'} className={notice.tone === 'success' ? 'text-success' : 'text-danger'}>{notice.text}</p> : null}
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body">
            <thead className="text-caption-sb text-ink-muted">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a._id} className="border-t border-line align-middle">
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3 break-all">{a.email}</td>
                  <td className="px-4 py-3">{a.role}</td>
                  <td className="px-4 py-3"><Pill label={a.disabled ? 'Disabled' : 'Active'} tone={a.disabled ? 'neutral' : 'success'} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatIstDateTime(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => patch(a, { disabled: !a.disabled })}>{a.disabled ? 'Enable' : 'Disable'}</Button>
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => patch(a, { role: a.role === 'ops' ? 'superadmin' : 'ops' })}>
                        {a.role === 'ops' ? 'Make Superadmin' : 'Make Ops'}
                      </Button>
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => setResetFor(a)}>Reset password</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <AddAdmin onAdd={(input) => act(() => api<AdminResponse>('/admin/admins', { method: 'POST', body: input satisfies CreateAdminInput }), 'Admin added')} />
      {resetFor ? <ResetPassword
        admin={resetFor}
        onClose={() => setResetFor(null)}
        onReset={async (a, password) => {
          // A refusal goes back to the dialog (the page notice would sit behind the modal).
          try {
            await api(`/admin/admins/${a._id}/reset-password`, { method: 'POST', body: { password } satisfies ResetPasswordInput });
          } catch (e) { return { ok: false, message: (e as Error).message }; }
          setResetFor(null);
          setNotice({ tone: 'success', text: 'Password reset' });
          return { ok: true };
        }}
      /> : null}
    </div>
  );
}

function AddAdmin({ onAdd }: { onAdd: (input: CreateAdminInput) => Promise<boolean> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('ops');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const sending = useRef(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    const n = name.trim();
    if (n.length < 2 || n.length > 80) { setError('Name must be 2-80 characters'); return; }
    if (!validPassword(password)) { setError(PASSWORD_ERROR); return; }
    setError('');
    sending.current = true;
    try {
      if (await onAdd({ name: n, email: email.trim(), role, password })) { setName(''); setEmail(''); setRole('ops'); setPassword(''); }
    } finally { sending.current = false; }
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <h2 className="font-display text-h3 sm:col-span-2">Add admin</h2>
        <Field label="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <label htmlFor="admin-role" className="mb-1.5 block text-caption-sb text-ink">Role</label>
          <select id="admin-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className="h-13.5 w-full rounded-md border-[1.5px] border-line bg-white px-4 text-body-md text-ink outline-none focus:border-violet">
            <option value="ops">Ops</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
        <Field label="Temporary password" type="password" autoComplete="new-password" value={password} maxLength={200} hint="12-200 characters" onChange={(e) => setPassword(e.target.value)} />
        <div className="sm:col-span-2">
          {error ? <p role="alert" className="mb-3 text-danger">{error}</p> : null}
          <Button type="submit">Add admin</Button>
        </div>
      </form>
    </Card>
  );
}

function ResetPassword({ admin, onClose, onReset }: { admin: AdminAccount; onClose: () => void; onReset: (a: AdminAccount, password: string) => Promise<{ ok: true } | { ok: false; message: string }> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  // Mounted only while open, so every open starts with an empty field.
  async function confirm() {
    if (sending.current) return;
    if (!validPassword(password)) { setError(PASSWORD_ERROR); return; }
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const res = await onReset(admin, password);
      if (!res.ok) setError(res.message);
    } finally { sending.current = false; setBusy(false); }
  }

  return (
    <ConfirmDialog open title="Reset password" confirmLabel="Reset password" loading={busy} onConfirm={confirm} onClose={() => { if (!sending.current) onClose(); }}>
      <Field label="New password" type="password" autoComplete="new-password" value={password} maxLength={200} error={error} hint={`For ${admin.email}: 12-200 characters`} onChange={(e) => setPassword(e.target.value)} />
    </ConfirmDialog>
  );
}
