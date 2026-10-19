'use client';

import { useState, type FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { CancelRefund } from '@/components/CancelRefund';
import { Button, Card, Field, Pill, type PillTone } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import type { AdminVoucher, VoucherResponse, VoucherStatus } from '@/lib/types';

const TONE: Record<VoucherStatus, PillTone> = { active: 'success', redeemed: 'violet', expired: 'neutral', cancelled: 'danger' };
type Notice = { tone: 'error' | 'success'; text: string };
type Row = [string, string];

export default function VouchersPage() {
  return (
    <AppShell title="Vouchers">
      <Lookup />
    </AppShell>
  );
}

function Lookup() {
  const [input, setInput] = useState('');
  const [voucher, setVoucher] = useState<AdminVoucher | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  // The number is passed in (not read from `input`), so the refresh after a cancel uses the number that was looked up.
  async function lookup(number: string) {
    setBusy(true);
    setError('');
    try {
      setVoucher((await api<VoucherResponse>(`/admin/vouchers?number=${encodeURIComponent(number)}`)).voucher);
    } catch (e) {
      setVoucher(null);
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    void lookup(input.trim());
  }

  const v = voucher;
  const details: Row[] = v ? [
    ['Number', v.number], ['Offer', v.offerTitle], ['Venue', v.venueName],
    ['Connects', formatNumber(v.connectsCost)], ['Discount', `₹${formatNumber(v.discountInr)}`], ['Funded by', v.fundedBy],
    ['Creator', v.creator.name ? `${v.creator.name}${v.creator.username ? ` @${v.creator.username}` : ''}` : '—'],
    ['Created', formatIstDateTime(v.createdAt)], ['Expires', formatIstDateTime(v.expiresAt)],
    ...(v.redeemedAt ? [['Redeemed', formatIstDateTime(v.redeemedAt)] as Row] : []),
    ...(v.cancelledAt ? [['Cancelled', formatIstDateTime(v.cancelledAt)] as Row, ['Cancel reason', v.cancelReason ?? '—'] as Row] : []),
  ] : [];

  return (
    <div className="space-y-5">
      <Card>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <Field className="min-w-64 flex-1" label="Voucher number" placeholder="TVABCD2345" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" spellCheck={false} />
          <Button type="submit" loading={busy}>Look up</Button>
        </form>
        {error ? <p role="alert" className="mt-3 text-danger">{error}</p> : null}
      </Card>
      {notice ? <p role="status" className={notice.tone === 'success' ? 'text-success' : 'text-danger'}>{notice.text}</p> : null}
      {v ? (
        <section aria-label="Voucher details">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Pill label={v.status} tone={TONE[v.status]} />
              {v.status === 'active' || v.status === 'redeemed' ? (
                <CancelRefund
                  voucher={v}
                  onDone={(text) => { setNotice({ tone: text.startsWith('Voucher cancelled and') ? 'success' : 'error', text }); void lookup(v.number); }}
                />
              ) : null}
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
              {details.map(([k, val]) => (
                <div key={k} className="contents">
                  <dt className="text-caption-sb text-ink-muted">{k}</dt>
                  <dd className="whitespace-pre-wrap break-words">{val}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
