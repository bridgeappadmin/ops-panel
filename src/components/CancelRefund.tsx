'use client';

import { useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button, Field } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import type { CancelVoucherInput, VoucherResponse } from '@/lib/types';

// api() returns only `data`, so the server's success text (voucher.service.ts) is repeated here.
const DONE = 'Voucher cancelled and refunded';

/**
 * "Cancel & refund" button + reason dialog (3-300 characters after trim). Posts /admin/vouchers/:id/cancel.
 * `onDone(message, ok)` runs after success (`ok`) and after a 500 (not `ok`: the voucher IS cancelled then, only the
 * refund is partial), with the text to show: the caller refetches and shows it, since this row may disappear. A
 * refused cancel (4xx) keeps the dialog open with the server's message.
 */
export function CancelRefund({ voucher, onDone }: { voucher: { _id: string; number: string }; onDone: (message: string, ok: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false); // state lags a fast double click; the ref doesn't

  const close = () => { setOpen(false); setError(''); };

  async function confirm() {
    if (sending.current) return;
    const text = reason.trim();
    if (text.length < 3 || text.length > 300) { setError('The reason must be 3-300 characters.'); return; }
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await api<VoucherResponse>(`/admin/vouchers/${voucher._id}/cancel`, { method: 'POST', body: { reason: text } satisfies CancelVoucherInput });
      close();
      setReason('');
      onDone(DONE, true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      if (e instanceof ApiError && e.status === 500) { close(); onDone(message, false); } else setError(message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Cancel &amp; refund</Button>
      <ConfirmDialog
        open={open}
        title={`Cancel voucher ${voucher.number}`}
        confirmLabel="Confirm refund"
        dismissLabel="Keep voucher"
        danger
        loading={busy}
        onConfirm={confirm}
        onClose={() => { if (!sending.current) close(); }}
      >
        <Field area label="Reason" hint="3-300 characters. The creator is refunded." value={reason} onChange={(e) => setReason(e.target.value)} error={error} maxLength={300} />
      </ConfirmDialog>
    </>
  );
}
