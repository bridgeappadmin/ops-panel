'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button, Card, Field, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import type { ConnectsConfig, Niche } from '@/lib/types';

const FIELDS: { key: keyof ConnectsConfig; label: string; min: number }[] = [
  { key: 'applicationCost', label: 'Application cost', min: 1 },
  { key: 'applicationCostFirst', label: 'Cost of the first applications', min: 1 },
  { key: 'applicationCostFirstCount', label: 'How many first applications', min: 0 },
  { key: 'signupGrant', label: 'Signup grant', min: 0 },
  { key: 'instagramGrant', label: 'Instagram grant', min: 0 },
  { key: 'youtubeGrant', label: 'YouTube grant', min: 0 },
  { key: 'monthlyRefill', label: 'Monthly refill', min: 0 },
  { key: 'balanceCeiling', label: 'Balance ceiling', min: 0 },
];
const MAX = 10000;

export default function SettingsPage() {
  return (
    <AppShell title="Settings" description="How creators earn and spend Connects, and the niches they pick from at sign-up.">
      <div className="space-y-6">
        <ConnectsSettings />
        <Niches />
      </div>
    </AppShell>
  );
}

function ConnectsSettings() {
  const [saved, setSaved] = useState<ConnectsConfig | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ config: ConnectsConfig }>('/admin/settings/connects').then((r) => setSaved(r.config), (e: Error) => setError(e.message));
  }, []);

  if (!saved) return error ? <p role="alert" className="text-danger-ink">{error}</p> : <Skeleton className="h-40 w-full" />;

  const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
  const valid = (k: keyof ConnectsConfig, min: number) => {
    const n = num(draft[k] ?? String(saved[k]));
    return Number.isInteger(n) && n >= min && n <= MAX;
  };
  const changed = FIELDS.filter((f) => draft[f.key] !== undefined && num(draft[f.key]) !== saved[f.key]);
  const allValid = FIELDS.every((f) => valid(f.key, f.min));

  async function save() {
    if (busy) return;
    const body = Object.fromEntries(changed.map((f) => [f.key, num(draft[f.key])]));
    setBusy(true); setError(''); setDone(false);
    try {
      const r = await api<{ config: ConnectsConfig }>('/admin/settings/connects', { method: 'PATCH', body });
      setSaved(r.config); setDraft({}); setDone(true);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Card>
      <h2 className="font-display text-h4">Connects</h2>
      <p className="mt-1 text-small text-ink-muted">Changes apply within a minute. Quest and milestone rewards are set in code.</p>
      <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        {FIELDS.map((f) => (
          <Field
            key={f.key} label={f.label} type="number" inputMode="numeric" min={f.min} max={MAX} step={1}
            value={draft[f.key] ?? String(saved[f.key])}
            error={valid(f.key, f.min) ? null : `Whole number from ${f.min} to ${MAX}`}
            onChange={(e) => { setDone(false); setDraft({ ...draft, [f.key]: e.target.value }); }}
          />
        ))}
      </div>
      <div className="mt-6 border-t border-line pt-5">
        {error ? <p role="alert" className="mb-3 text-danger-ink">{error}</p> : null}
        {done ? <p role="status" className="mb-3 text-success-ink">Saved</p> : null}
        <Button disabled={changed.length === 0 || !allValid} loading={busy} onClick={save}>Save Connects settings</Button>
      </div>
    </Card>
  );
}

function Niches() {
  const [niches, setNiches] = useState<Niche[] | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Niche | null>(null);

  const load = async () => setNiches((await api<{ niches: Niche[] }>('/admin/niches')).niches);
  useEffect(() => {
    api<{ niches: Niche[] }>('/admin/niches').then((r) => setNiches(r.niches), (e: Error) => setError(e.message));
  }, []);

  // One change at a time, then a refetch. A refusal shows under the section title, or in the dialog while it is open.
  async function act(run: () => Promise<unknown>): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setError('');
    try { await run(); await load(); return true; } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }
  const valid = (s: string) => s.trim().length >= 2 && s.trim().length <= 50;

  return (
    <Card>
      <h2 className="font-display text-h4">Niches</h2>
      <p className="mt-1 text-small text-ink-muted">Rename or remove one, or add a new one below.</p>
      {error && !removing ? <p role="alert" className="mt-2 text-danger-ink">{error}</p> : null}
      {niches === null ? (error ? null : <Skeleton className="mt-3 h-24 w-full" />) : (
        <ul className="mt-4 grid gap-2 lg:grid-cols-2">
          {niches.map((n) => <NicheRow key={`${n._id}:${n.name}`} niche={n} disabled={busy} valid={valid}
            onRename={(v) => act(() => api(`/admin/niches/${n._id}`, { method: 'PATCH', body: { name: v.trim() } }))}
            onRemove={() => { setError(''); setRemoving(n); }} />)}
        </ul>
      )}
      <form className="mt-6 flex items-end gap-3 border-t border-line pt-5" onSubmit={async (e) => { e.preventDefault(); if (valid(name) && await act(() => api('/admin/niches', { method: 'POST', body: { name: name.trim() } }))) setName(''); }}>
        <Field label="New niche" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} className="w-full sm:w-80" />
        <Button type="submit" disabled={!valid(name) || busy}>Add niche</Button>
      </form>
      <ConfirmDialog open={!!removing} danger title="Remove niche" confirmLabel="Remove" loading={busy} onClose={() => { setRemoving(null); setError(''); }}
        onConfirm={async () => { if (removing && await act(() => api(`/admin/niches/${removing._id}`, { method: 'DELETE' }))) setRemoving(null); }}>
        <p>Remove {removing?.name}? It stops being offered to new sign-ups.</p>
        {error ? <p role="alert" className="mt-3 text-danger-ink">{error}</p> : null}
      </ConfirmDialog>
    </Card>
  );
}

function NicheRow({ niche, disabled, valid, onRename, onRemove }: { niche: Niche; disabled: boolean; valid: (s: string) => boolean; onRename: (v: string) => void; onRemove: () => void }) {
  const [v, setV] = useState(niche.name);
  const dirty = v.trim() !== niche.name;
  return (
    <li className="flex items-center gap-2 rounded-md border border-line p-2">
      <input aria-label={`Rename ${niche.name}`} value={v} maxLength={50} onChange={(e) => setV(e.target.value)}
        className="h-10 min-w-0 flex-1 rounded-sm border border-transparent bg-white px-3 text-body text-ink outline-none hover:border-line focus:border-violet" />
      <Button variant="secondary" size="sm" aria-label={`Save ${niche.name}`} disabled={disabled || !dirty || !valid(v)} onClick={() => onRename(v)}>Save</Button>
      <Button variant="danger" size="sm" aria-label={`Remove ${niche.name}`} disabled={disabled} onClick={onRemove}>Remove</Button>
    </li>
  );
}
