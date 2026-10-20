import type { CreateOfferInput, Offer, OfferFundedBy, OfferRequirement, RequirementMetric, RequirementPlatform, UpdateOfferInput } from './types';

/** The offer form's state: strings as typed by the user. */
export interface OfferFormValues {
  brandId: string; coords: string; address: string; discountInr: string; connectsCost: string; totalCoupons: string;
  fundedBy: OfferFundedBy; voucherValidityDays: string; startsAt: string; endsAt: string;
  requirements: Array<{ platform: RequirementPlatform; metric: RequirementMetric; min: string }>;
  title: string; description: string; terms: string; deliverables: string;
}

export const emptyValues = (): OfferFormValues => ({
  brandId: '', coords: '', address: '', discountInr: '', connectsCost: '', totalCoupons: '', fundedBy: 'brand',
  voucherValidityDays: '7', startsAt: '', endsAt: '', requirements: [], title: '', description: '', terms: '', deliverables: '',
});

/** "12.97, 77.59" -> lat, lng; null unless two finite numbers in range. */
export function parseCoords(text: string): { lat: number; lng: number } | null {
  const parts = text.split(',').map((s) => s.trim());
  if (parts.length !== 2 || parts.includes('')) return null;
  const [lat, lng] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function coordsOf(text: string) {
  const c = parseCoords(text);
  if (!c) throw new Error('Enter coordinates as "lat, lng"');
  return c;
}
function isoOf(local: string, label: string) {
  const d = new Date(local);
  if (!local || Number.isNaN(d.getTime())) throw new Error(`Enter the ${label} date`);
  return d.toISOString();
}
function requirementsOf(v: OfferFormValues): OfferRequirement[] {
  if (v.requirements.some((r) => r.min.trim() === '')) throw new Error('Enter a minimum for each requirement');
  return v.requirements.map((r) => ({ platform: r.platform, metric: r.metric, min: Number(r.min) }));
}
const texts = (v: OfferFormValues) => ({
  title: v.title.trim(), description: v.description.trim(), terms: v.terms.trim(), deliverables: v.deliverables.trim(), address: v.address.trim(),
});

/** The exact POST /admin/offers body (createValidator). Throws a message for what the form must catch itself. */
export function toCreateBody(v: OfferFormValues): CreateOfferInput {
  if (!v.brandId) throw new Error('Pick a venue');
  return {
    brandId: v.brandId, ...texts(v), ...coordsOf(v.coords), requirements: requirementsOf(v),
    discountInr: Number(v.discountInr), connectsCost: Number(v.connectsCost), totalCoupons: Number(v.totalCoupons),
    fundedBy: v.fundedBy, voucherValidityDays: Number(v.voucherValidityDays),
    startsAt: isoOf(v.startsAt, 'start'), endsAt: isoOf(v.endsAt, 'end'),
  };
}

/** datetime-local wants the browser's local time, not UTC. */
const toLocalInput = (iso: string) => new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** The current local time to the minute, in datetime-local format. */
export const nowLocalInput = (now: Date = new Date()) => toLocalInput(now.toISOString());

export function fromOffer(o: Offer): OfferFormValues {
  return {
    brandId: o.brandId, coords: `${o.location.coordinates[1]}, ${o.location.coordinates[0]}`, address: o.address,
    discountInr: String(o.discountInr), connectsCost: String(o.connectsCost), totalCoupons: String(o.totalCoupons),
    fundedBy: o.fundedBy, voucherValidityDays: String(o.voucherValidityDays),
    startsAt: toLocalInput(o.startsAt), endsAt: toLocalInput(o.endsAt),
    requirements: o.requirements.map((r) => ({ platform: r.platform, metric: r.metric, min: String(r.min) })),
    title: o.title, description: o.description, terms: o.terms, deliverables: o.deliverables ?? '',
  };
}

/** Only the changed editable fields (UpdateOfferInput). Never brandId, startsAt, the money or the funder. */
export function toPatchBody(original: Offer, v: OfferFormValues): UpdateOfferInput {
  const body: UpdateOfferInput = {};
  const t = texts(v);
  for (const k of Object.keys(t) as Array<keyof typeof t>) if (t[k] !== (original[k] ?? '')) body[k] = t[k];
  if (Number(v.voucherValidityDays) !== original.voucherValidityDays) body.voucherValidityDays = Number(v.voucherValidityDays);
  if (v.endsAt !== fromOffer(original).endsAt) body.endsAt = isoOf(v.endsAt, 'end');
  const { lat, lng } = coordsOf(v.coords);
  if (lat !== original.location.coordinates[1] || lng !== original.location.coordinates[0]) Object.assign(body, { lat, lng });
  const reqs = requirementsOf(v);
  if (JSON.stringify(reqs) !== JSON.stringify(original.requirements.map(({ platform, metric, min }) => ({ platform, metric, min })))) body.requirements = reqs;
  return body;
}
