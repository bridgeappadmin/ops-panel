'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VenueSearch } from '@/components/VenueSearch';
import { Button, Card, Field } from '@/components/ui';
import { api } from '@/lib/api';
import { emptyValues, fromOffer, toCreateBody, toPatchBody, type OfferFormValues } from '@/lib/offerForm';
import { fundedByLabel } from '@/lib/offers';
import type { Offer, RequirementMetric, RequirementPlatform, SavedOfferResponse, Venue } from '@/lib/types';

const PLATFORMS = [['instagram', 'Instagram'], ['youtube', 'YouTube']];
const METRICS = [['followers', 'Followers'], ['engagementRate', 'Engagement %']];
const selectCls = 'h-13.5 rounded-md border-[1.5px] border-line bg-white px-3 text-body text-ink outline-none focus:border-violet';
type TextKey = 'title' | 'address' | 'coords' | 'discountInr' | 'connectsCost' | 'totalCoupons' | 'voucherValidityDays' | 'startsAt' | 'endsAt';
type AreaKey = 'description' | 'terms' | 'deliverables';

/** Create (no `offer`) or edit. A create sends everything; an edit sends only what changed, and the venue is read-only. */
export function OfferForm({ offer }: { offer?: Offer }) {
  const router = useRouter();
  const [v, setV] = useState<OfferFormValues>(() => (offer ? fromOffer(offer) : emptyValues()));
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const set = <K extends keyof OfferFormValues>(k: K, val: OfferFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const text = (k: TextKey, label: string, extra = {}) => <Field label={label} value={v[k]} onChange={(e) => set(k, e.target.value)} {...extra} />;
  const area = (k: AreaKey, label: string) => <Field area label={label} rows={3} value={v[k]} onChange={(e) => set(k, e.target.value)} />;
  const setReq = (i: number, patch: Partial<OfferFormValues['requirements'][number]>) =>
    set('requirements', v.requirements.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      if (!offer) {
        const created = await api<SavedOfferResponse>('/admin/offers', { method: 'POST', body: toCreateBody(v) });
        router.push(`/offers/${created.offer._id}`);
        return; // stays locked while the page changes
      }
      const body = toPatchBody(offer, v);
      if (Object.keys(body).length) await api(`/admin/offers/${offer._id}`, { method: 'PATCH', body });
      router.push(`/offers/${offer._id}`);
      return;
    } catch (err) {
      setError((err as Error).message);
    }
    sending.current = false;
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Card>
        <div className="space-y-4">
          {offer ? (
            <p className="text-body"><span className="text-caption-sb text-ink-muted">Venue </span>{offer.venue?.name ?? '—'}{offer.venue?.city ? `, ${offer.venue.city}` : ''}</p>
          ) : (
            <>
              <VenueSearch onPick={(b) => { setVenue(b); setV((p) => ({ ...p, brandId: b._id, coords: b.location ? `${b.location.lat}, ${b.location.lng}` : p.coords })); }} />
              <p className="text-body text-ink-muted">{venue ? `Venue: ${venue.name ?? '—'} ${venue.username ? `(@${venue.username})` : ''} ${venue.city ?? ''} ${venue.phoneNumber ?? ''}` : 'No venue picked.'}</p>
            </>
          )}
          {text('title', 'Title')}
          {area('description', 'Description')}
          {area('terms', 'Terms and conditions')}
          {area('deliverables', 'Deliverables')}
          {text('address', 'Address')}
          {text('coords', 'Coordinates (lat, lng)', { placeholder: '12.9716, 77.5946' })}
        </div>
      </Card>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {!offer && text('discountInr', 'Discount (₹)', { type: 'number', min: 1 })}
          {!offer && text('connectsCost', 'Cost (Connects)', { type: 'number', min: 1 })}
          {!offer && text('totalCoupons', 'Coupons', { type: 'number', min: 1 })}
          {!offer && (
            <fieldset className="flex items-center gap-4 sm:col-span-2">
              <legend className="mb-1.5 text-caption-sb text-ink">Funded by</legend>
              {(['brand', 'tazmify'] as const).map((f) => (
                <label key={f} className="flex items-center gap-2 text-body">
                  <input type="radio" name="fundedBy" checked={v.fundedBy === f} onChange={() => set('fundedBy', f)} className="accent-violet" />
                  {fundedByLabel(f)}
                </label>
              ))}
            </fieldset>
          )}
          {!offer && text('startsAt', 'Starts', { type: 'datetime-local' })}
          {text('endsAt', 'Ends', { type: 'datetime-local' })}
          {text('voucherValidityDays', 'Voucher validity (days)', { type: 'number', min: 1, max: 60 })}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-h4">Requirements</h2>
        <div className="space-y-3">
          {v.requirements.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select aria-label={`Platform ${i + 1}`} className={selectCls} value={r.platform} onChange={(e) => setReq(i, { platform: e.target.value as RequirementPlatform })}>
                {PLATFORMS.map(([val, t]) => <option key={val} value={val}>{t}</option>)}
              </select>
              <select aria-label={`Metric ${i + 1}`} className={selectCls} value={r.metric} onChange={(e) => setReq(i, { metric: e.target.value as RequirementMetric })}>
                {METRICS.map(([val, t]) => <option key={val} value={val}>{t}</option>)}
              </select>
              <Field aria-label={`Minimum ${i + 1}`} type="number" min={0} step="any" placeholder="Minimum" value={r.min} onChange={(e) => setReq(i, { min: e.target.value })} />
              <Button variant="ghost" size="sm" aria-label={`Remove requirement ${i + 1}`} onClick={() => set('requirements', v.requirements.filter((_, j) => j !== i))}>Remove</Button>
            </div>
          ))}
          <Button variant="tint" size="sm" disabled={v.requirements.length >= 4}
            onClick={() => set('requirements', [...v.requirements, { platform: 'instagram', metric: 'followers', min: '' }])}>Add requirement</Button>
        </div>
      </Card>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={busy}>{offer ? 'Save changes' : 'Create offer'}</Button>
        {offer ? <Link href={`/offers/${offer._id}`} className="text-body-sb text-violet hover:underline">Cancel</Link> : null}
      </div>
    </form>
  );
}
