'use client';

import { useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field } from '@/components/ui';

/** `onSubmit` answers the server's refusal ('' when it went through, and the parent closes the dialog). Mounted only while open. */
export function SuspendDialog({ kind, onSubmit, onClose }: { kind: 'creator' | 'brand'; onSubmit: (reason: string) => Promise<string>; onClose: () => void }) {
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
    <ConfirmDialog open title={`Suspend ${kind}`} confirmLabel="Suspend" danger loading={busy} onConfirm={confirm} onClose={() => { if (!sending.current) onClose(); }}>
      <Field area label={`Shown to the ${kind}`} value={reason} maxLength={300} error={error} onChange={(e) => setReason(e.target.value)} />
    </ConfirmDialog>
  );
}
