import { formatIstDateTime } from './format';
import type { Offer, OfferFundedBy } from './types';

/** 'Brand' / 'Tazmify', as the form's radios, the report and its CSV say it. */
export const fundedByLabel = (f: OfferFundedBy): string => (f === 'tazmify' ? 'Tazmify' : 'Brand');

/** Nothing moves an offer to `ended` when its date passes, so an active offer past `endsAt` reads as ended. */
export function offerStatusText(offer: Pick<Offer, 'status' | 'endsAt'>, now: Date = new Date()): string {
  return offer.status === 'active' && new Date(offer.endsAt) <= now ? `ended (${formatIstDateTime(offer.endsAt)})` : offer.status;
}
