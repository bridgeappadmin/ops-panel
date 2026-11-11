'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { CancelRefund } from '@/components/CancelRefund';
import { VoucherStatusPill } from '@/components/VoucherStatusPill';
import { Button, Card, Field, Icon } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import { fundedByLabel } from '@/lib/offers';
import type { AdminVoucher, VoucherResponse } from '@/lib/types';

type Notice = { tone: 'error' | 'success'; text: string };
type Row = [string, string];

export default function VouchersPage() {
  return (
    <AppShell title="Vouchers" description="Look up a voucher by its number to check it, or cancel it and refund the creator.">
      {/* useSearchParams needs a Suspense boundary to prerender. */}
      <Suspense><Lookup /></Suspense>
    </AppShell>
  );
}

/** `?number=` (from Jump to) fills the field and looks the voucher up. */
function Lookup() {
  const linked = useSearchParams().get('number') ?? '';
  const [input, setInput] = useState(linked);
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

  // Once per number: a dev-mode double effect, or a re-render, must not send it twice. A new number (Jump to again) fills the field too.
  const looked = useRef('');
  useEffect(() => {
    if (!linked || looked.current === linked) return;
    looked.current = linked;
    setInput(linked);
    void lookup(linked.trim());
  }, [linked]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    void lookup(input.trim());
  }

  const v = voucher;
  const details: Row[] = v ? [
    ['Number', v.number], ['Offer', v.offerTitle], ['Venue', v.venueName],
    ['Connects', formatNumber(v.connectsCost)], ['Discount', `₹${formatNumber(v.discountInr)}`], ['Funded by', fundedByLabel(v.fundedBy)],
    ['Creator', v.creator.name ? `${v.creator.name}${v.creator.username ? ` @${v.creator.username}` : ''}` : '—'],
    ['Created', formatIstDateTime(v.createdAt)], ['Expires', formatIstDateTime(v.expiresAt)],
    ...(v.redeemedAt ? [['Redeemed', formatIstDateTime(v.redeemedAt)] as Row] : []),
    ...(v.cancelledAt ? [['Cancelled', formatIstDateTime(v.cancelledAt)] as Row, ['Cancel reason', v.cancelReason ?? '—'] as Row] : []),
  ] : [];

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <Field className="min-w-64 flex-1" label="Voucher number" placeholder="TVABCD2345" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" spellCheck={false} />
          <Button type="submit" loading={busy}><Icon name="search" size={16} />Look up</Button>
        </form>
        {error ? <p role="alert" className="mt-3 text-danger-ink">{error}</p> : null}
      </Card>
      {notice ? <p role={notice.tone === 'error' ? 'alert' : 'status'} className={notice.tone === 'success' ? 'text-success-ink' : 'text-danger-ink'}>{notice.text}</p> : null}
      {v ? (
        <section aria-label="Voucher details">
          <Card padded={false}>
            <div className="flex flex-wrap items-center gap-4 border-b border-line p-6">
              <span className="inline-flex size-11 items-center justify-center rounded-md bg-violet-tint text-violet-pressed"><Icon name="ticket" size={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-h3">{v.number}</p>
                <p className="text-small text-ink-muted">{v.offerTitle} · {v.venueName}</p>
              </div>
              <VoucherStatusPill status={v.status} />
              {v.status === 'active' || v.status === 'redeemed' ? (
                <CancelRefund
                  voucher={v}
                  onDone={(text, ok) => { setNotice({ tone: ok ? 'success' : 'error', text }); void lookup(v.number); }}
                />
              ) : null}
            </div>
            <dl className="grid gap-x-8 p-6 sm:grid-cols-2">
              {details.map(([k, val]) => (
                <div key={k} className="border-b border-line py-3">
                  <dt className="text-caption text-ink-muted">{k}</dt>
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
