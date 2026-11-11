'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CancelRefund } from '@/components/CancelRefund';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { OfferStatusPill } from '@/components/OfferStatusPill';
import { VoucherStatusPill } from '@/components/VoucherStatusPill';
import { Button, Card, Field, Skeleton, Stats, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import { fundedByLabel } from '@/lib/offers';
import type { AdminVoucher, Offer, OfferResponse, OfferVouchersResponse, UpdateOfferInput } from '@/lib/types';

type Notice = { tone: 'error' | 'success'; text: string };

// The shell's title is the offer's, which only the details (inside the shell, so signed in) load: they hand it up.
export default function OfferPage() {
  const [title, setTitle] = useState('Offer');
  return <AppShell title={title} hideTitle><OfferDetails onTitle={setTitle} /></AppShell>;
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

  if (loadError) return <p role="alert" className="text-danger-ink">{loadError}</p>;
  if (!offer) return <Skeleton className="h-64 w-full" />;

  const ended = offer.status === 'ended';
  const about: [string, string][] = [
    ['Description', offer.description],
    ['Terms', offer.terms],
    ['Deliverables', offer.deliverables || '—'],
    ['Requirements', offer.requirements.map((r) => `${r.platform} ${r.metric === 'followers' ? 'followers' : 'engagement %'} at least ${formatNumber(r.min)}`).join('; ') || 'None'],
  ];
  const logistics: [string, string][] = [
    ['Venue', `${offer.venue?.name ?? '—'}${offer.venue?.city ? `, ${offer.venue.city}` : ''}`],
    ['Funded by', fundedByLabel(offer.fundedBy)],
    ['Dates', `${formatIstDateTime(offer.startsAt)} to ${formatIstDateTime(offer.endsAt)}`],
    ['Address', offer.address],
  ];
  const list = (rows: [string, string][]) => (
    <dl className="mt-3 divide-y divide-line">
      {rows.map(([k, v]) => <div key={k} className="py-3"><dt className="text-caption text-ink-muted">{k}</dt><dd className="whitespace-pre-wrap break-words">{v}</dd></div>)}
    </dl>
  );

  return (
    <>
      <div className="space-y-6">
        <Card padded={false}>
          <div className="flex flex-wrap items-center gap-5 p-6">
            <div className="min-w-0 flex-1 basis-72">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="font-display text-h1">{offer.title}</h1>
                <OfferStatusPill offer={offer} />
              </div>
              <p className="mt-1.5 text-small text-ink-muted">{offer.venue?.name ?? '—'}{offer.venue?.city ? ` · ${offer.venue.city}` : ''} · {fundedByLabel(offer.fundedBy)}</p>
            </div>
            {!ended && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => void patch({ status: offer.status === 'paused' ? 'active' : 'paused' })}>
                  {offer.status === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setDialog('coupons')}>Add coupons</Button>
                <Link href={`/offers/${offer._id}/edit`} className="inline-flex h-10 items-center rounded-sm border border-line-strong bg-white px-3.5 text-small-sb text-ink hover:bg-cloud">Edit</Link>
                <Button variant="danger" size="sm" disabled={busy} onClick={() => setDialog('end')}>End offer</Button>
              </div>
            )}
          </div>
          {notice ? (
            <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`border-t border-line bg-cloud px-6 py-3 ${notice.tone === 'error' ? 'text-danger-ink' : 'text-success-ink'}`}>{notice.text}</p>
          ) : null}
        </Card>

        <Stats items={[
          { label: 'Coupons', value: `${formatNumber(offer.remainingCoupons)} left of ${formatNumber(offer.totalCoupons)}` },
          { label: 'Discount', value: `₹${formatNumber(offer.discountInr)}` },
          { label: 'Cost', value: `${formatNumber(offer.connectsCost)} Connects` },
          { label: 'Voucher validity', value: `${offer.voucherValidityDays} days` },
        ]} />

        <div className="grid items-start gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2"><h2 className="font-display text-h4">The offer</h2>{list(about)}</Card>
          <Card><h2 className="font-display text-h4">Where and when</h2>{list(logistics)}</Card>
        </div>

        <Card padded={false}>
          <h2 className="p-6 pb-4 font-display text-h4">Vouchers</h2>
          {vouchers === null ? (
            <div className="px-6 pb-6"><Skeleton className="h-24 w-full" /></div>
          ) : vouchers.length === 0 ? (
            <p className="px-6 pb-6 text-ink-muted">No vouchers claimed yet.</p>
          ) : (
            <Table>
              <thead><tr>{['Number', 'Creator', 'Status', 'Claimed', 'Expires', 'Redeemed', ''].map((h, i) => <Th key={i}>{h}</Th>)}</tr></thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v._id}>
                    <Td className="font-mono">{v.number}</Td>
                    <Td>{v.creator.name || '—'}{v.creator.username ? <span className="text-ink-muted"> @{v.creator.username}</span> : null}</Td>
                    <Td><VoucherStatusPill status={v.status} /></Td>
                    <Td className="whitespace-nowrap text-ink-muted">{formatIstDateTime(v.createdAt)}</Td>
                    <Td className="whitespace-nowrap text-ink-muted">{formatIstDateTime(v.expiresAt)}</Td>
                    <Td className="whitespace-nowrap text-ink-muted">{v.redeemedAt ? formatIstDateTime(v.redeemedAt) : '—'}</Td>
                    <Td className="text-right">
                      {v.status === 'active' || v.status === 'redeemed' ? (
                        // A cancel returns the coupon, so the offer's count changes too.
                        <CancelRefund
                          voucher={v}
                          onDone={(text, ok) => { setNotice({ tone: ok ? 'success' : 'error', text }); void loadOffer(); void loadVouchers(); }}
                        />
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <ConfirmDialog open={dialog === 'end'} title="End this offer?" confirmLabel="End offer" dismissLabel="Keep offer" danger loading={busy} onConfirm={() => void confirmEnd()} onClose={closeDialog}>
        <p className="text-body text-ink-muted">This cannot be undone.</p>
      </ConfirmDialog>
      <ConfirmDialog open={dialog === 'coupons'} title="Add coupons" confirmLabel="Add" loading={busy} onConfirm={() => void confirmAdd()} onClose={closeDialog}>
        <Field label="Coupons to add" type="number" inputMode="numeric" min={1} max={10000} value={count} onChange={(e) => setCount(e.target.value)} error={countError} hint="1 to 10,000" />
      </ConfirmDialog>
    </>
  );
}
