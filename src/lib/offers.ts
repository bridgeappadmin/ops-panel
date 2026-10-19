import { formatIstDateTime } from './format';
import type { Offer } from './types';

/** Nothing moves an offer to `ended` when its date passes, so an active offer past `endsAt` reads as ended. */
export function offerStatusText(offer: Pick<Offer, 'status' | 'endsAt'>, now: Date = new Date()): string {
  return offer.status === 'active' && new Date(offer.endsAt) <= now ? `ended (${formatIstDateTime(offer.endsAt)})` : offer.status;
}
