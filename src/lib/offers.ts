import { formatIstDateTime } from './format';
import type { Offer, OfferFundedBy } from './types';

/** 'Brand' / 'Tazmify', as the form's radios, the report and its CSV say it. */
export const fundedByLabel = (f: OfferFundedBy): string => (f === 'tazmify' ? 'Tazmify' : 'Brand');

/**
 * Nothing moves an offer to `ended` when its date passes, so an active offer past `endsAt` reads as ended; one
 * that has not started yet reads as scheduled (creators only see it from `startsAt`).
 */
export function offerStatusText(offer: Pick<Offer, 'status' | 'startsAt' | 'endsAt'>, now: Date = new Date()): string {
  if (offer.status !== 'active') return offer.status;
  if (new Date(offer.endsAt) <= now) return `ended (${formatIstDateTime(offer.endsAt)})`;
  return new Date(offer.startsAt) > now ? `Scheduled · starts ${formatIstDateTime(offer.startsAt)}` : 'active';
}
