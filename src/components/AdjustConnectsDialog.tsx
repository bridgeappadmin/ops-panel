'use client';

import { useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field } from '@/components/ui';
import type { AdjustConnectsInput } from '@/lib/types';

/** `onSubmit` answers the server's refusal ('' when it went through, and the parent closes the dialog). Mounted only while open. */
export function AdjustConnectsDialog({ onSubmit, onClose }: { onSubmit: (input: AdjustConnectsInput) => Promise<string>; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  async function confirm() {
    if (sending.current) return;
    const n = Number(amount);
    const r = reason.trim();
    if (!amount.trim() || !Number.isInteger(n) || n === 0 || Math.abs(n) > 100000) { setError('Amount must be a whole number from -100000 to 100000, not 0'); return; }
    if (r.length < 3 || r.length > 200) { setError('Reason must be 3-200 characters'); return; }
    sending.current = true;
    setBusy(true);
    setError('');
    try { setError(await onSubmit({ amount: n, reason: r, ...(note.trim() ? { note: note.trim() } : {}) })); } finally { sending.current = false; setBusy(false); }
  }

  return (
    <ConfirmDialog open title="Adjust Connects" confirmLabel="Apply" loading={busy} onConfirm={confirm} onClose={() => { if (!sending.current) onClose(); }}>
      <div className="space-y-3">
        <Field label="Amount" type="number" value={amount} hint="Negative deducts" onChange={(e) => setAmount(e.target.value)} />
        <Field label="Shown to the creator" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
        <Field area label="Internal note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        {error ? <p role="alert" className="text-small text-danger-ink">{error}</p> : null}
      </div>
    </ConfirmDialog>
  );
}
