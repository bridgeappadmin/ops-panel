import { Pill, type PillTone } from '@/components/ui';
import { offerStatusText } from '@/lib/offers';
import type { Offer } from '@/lib/types';

/** Green when live, violet when scheduled, amber when paused, grey once ended (including an active offer past its end date). */
export function OfferStatusPill({ offer }: { offer: Pick<Offer, 'status' | 'startsAt' | 'endsAt'> }) {
  const text = offerStatusText(offer);
  const tone: PillTone = text === 'active' ? 'success' : text === 'paused' ? 'warning' : text.startsWith('Scheduled') ? 'violet' : 'neutral';
  return <Pill label={text} tone={tone} />;
}
