'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CancelRefund } from '@/components/CancelRefund';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { OfferStatusPill } from '@/components/OfferStatusPill';
import { VoucherStatusPill } from '@/components/VoucherStatusPill';
import { Button, Card, Field, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import { fundedByLabel } from '@/lib/offers';
import type { AdminVoucher, Offer, OfferResponse, OfferVouchersResponse, UpdateOfferInput } from '@/lib/types';

type Notice = { tone: 'error' | 'success'; text: string };

// The shell's title is the offer's, which only the details (inside the shell, so signed in) load: they hand it up.
export default function OfferPage() {
  const [title, setTitle] = useState('Offer');
  return <AppShell title={title}><OfferDetails onTitle={setTitle} /></AppShell>;
}

function OfferDetails({ onTitle }: { onTitle: (title: string) => void }) {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [vouchers, setVouchers] = useState<AdminVoucher[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialog, setDialog] = useState<'end' | 'coupons' | null>(null);
  const [count, setCount] = useState('');
  const [countError, setCountError] = useState('');
  const [busy, setBusy] = useState(false);

  // State is set only in the callbacks, so the mount effect below can call these.
  const loadOffer = useCallback(() => api<OfferResponse>(`/admin/offers/${id}`).then(
    ({ offer: loaded }) => { setOffer(loaded); onTitle(loaded.title); setLoadError(''); },
    (e: Error) => setLoadError(e.message),
  ), [id, onTitle]);
  const loadVouchers = useCallback(() => api<OfferVouchersResponse>(`/admin/offers/${id}/vouchers`).then(
    (r) => setVouchers(r.vouchers),
    (e: Error) => setNotice({ tone: 'error', text: e.message }),
  ), [id]);
  useEffect(() => {
    void loadOffer();
    void loadVouchers();
  }, [loadOffer, loadVouchers]);

  // The PATCH answers without `venue`, so refetch the offer instead of reading its response.
  async function patch(body: UpdateOfferInput): Promise<boolean> {
    setNotice(null);
    setBusy(true);
    try {
      await api(`/admin/offers/${id}`, { method: 'PATCH', body });
      await loadOffer();
      return true;
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message });
      return false;
    } finally { setBusy(false); }
  }

  const closeDialog = () => { setDialog(null); setCountError(''); };
  async function confirmEnd() {
    await patch({ status: 'ended' });
    closeDialog();
  }
  async function confirmAdd() {
    const n = Number(count);
    if (count.trim() === '' || !Number.isInteger(n) || n < 1 || n > 10000) { setCountError('Enter a whole number from 1 to 10,000.'); return; }
    if (await patch({ addCoupons: n })) setCount('');
    closeDialog();
  }

  if (loadError) return <p role="alert" className="text-danger">{loadError}</p>;
  if (!offer) return <Skeleton className="h-64 w-full" />;

  const ended = offer.status === 'ended';
  const details: [string, string][] = [
    ['Venue', `${offer.venue?.name ?? '—'}${offer.venue?.city ? `, ${offer.venue.city}` : ''}`],
    ['Coupons', `${formatNumber(offer.remainingCoupons)} left of ${formatNumber(offer.totalCoupons)}`],
    ['Discount', `₹${formatNumber(offer.discountInr)}`],
    ['Cost', `${formatNumber(offer.connectsCost)} Connects`],
    ['Funded by', fundedByLabel(offer.fundedBy)],
    ['Voucher validity', `${offer.voucherValidityDays} days`],
    ['Dates', `${formatIstDateTime(offer.startsAt)} to ${formatIstDateTime(offer.endsAt)}`],
    ['Address', offer.address],
    ['Requirements', offer.requirements.map((r) => `${r.platform} ${r.metric === 'followers' ? 'followers' : 'engagement %'} at least ${formatNumber(r.min)}`).join('; ') || 'None'],
    ['Description', offer.description],
    ['Terms', offer.terms],
    ['Deliverables', offer.deliverables || '—'],
  ];

  return (
    <>
      <div className="space-y-5">
        <Link href="/offers" className="text-small-sb text-violet hover:underline">All offers</Link>
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <OfferStatusPill offer={offer} />
            {!ended && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => void patch({ status: offer.status === 'paused' ? 'active' : 'paused' })}>
                  {offer.status === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="tint" size="sm" disabled={busy} onClick={() => setDialog('coupons')}>Add coupons</Button>
                <Link href={`/offers/${offer._id}/edit`} className="inline-flex h-12.5 items-center rounded-md border-[1.5px] border-line bg-white px-4 text-body-sb text-ink hover:border-line-strong">Edit</Link>
                <Button variant="danger" size="sm" disabled={busy} onClick={() => setDialog('end')}>End offer</Button>
              </div>
            )}
          </div>
          {notice ? (
            <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mb-4 ${notice.tone === 'error' ? 'text-danger' : 'text-success'}`}>{notice.text}</p>
          ) : null}
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
            {details.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-caption-sb text-ink-muted">{k}</dt>
                <dd className="whitespace-pre-wrap break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <h2 className="font-display text-h3">Vouchers</h2>
        {vouchers === null ? (
          <Skeleton className="h-24 w-full" />
        ) : vouchers.length === 0 ? (
          <Card><p className="text-ink-muted">No vouchers claimed yet.</p></Card>
        ) : (
          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead className="text-caption-sb text-ink-muted">
                  <tr>
                    {['Number', 'Creator', 'Status', 'Claimed', 'Expires', 'Redeemed', ''].map((h, i) => (
                      <th key={i} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v._id} className="border-t border-line align-middle">
                      <td className="px-4 py-3 font-mono">{v.number}</td>
                      <td className="px-4 py-3">{v.creator.name || '—'}{v.creator.username ? ` @${v.creator.username}` : ''}</td>
                      <td className="px-4 py-3"><VoucherStatusPill status={v.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatIstDateTime(v.createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatIstDateTime(v.expiresAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{v.redeemedAt ? formatIstDateTime(v.redeemedAt) : '—'}</td>
                      <td className="px-4 py-3">
                        {v.status === 'active' || v.status === 'redeemed' ? (
                          // A cancel returns the coupon, so the offer's count changes too.
                          <CancelRefund
                            voucher={v}
                            onDone={(text, ok) => { setNotice({ tone: ok ? 'success' : 'error', text }); void loadOffer(); void loadVouchers(); }}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog open={dialog === 'end'} title="End this offer?" confirmLabel="End offer" dismissLabel="Keep offer" danger loading={busy} onConfirm={() => void confirmEnd()} onClose={closeDialog}>
        <p className="text-center text-body text-ink-muted">This cannot be undone.</p>
      </ConfirmDialog>
      <ConfirmDialog open={dialog === 'coupons'} title="Add coupons" confirmLabel="Add" loading={busy} onConfirm={() => void confirmAdd()} onClose={closeDialog}>
        <Field label="Coupons to add" type="number" inputMode="numeric" min={1} max={10000} value={count} onChange={(e) => setCount(e.target.value)} error={countError} hint="1 to 10,000" />
      </ConfirmDialog>
    </>
  );
}
