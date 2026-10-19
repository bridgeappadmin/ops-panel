import { Pill, type PillTone } from '@/components/ui';
import { offerStatusText } from '@/lib/offers';
import type { Offer } from '@/lib/types';

/** Green when live, amber when paused, grey once ended (including an active offer past its end date). */
export function OfferStatusPill({ offer }: { offer: Pick<Offer, 'status' | 'endsAt'> }) {
  const text = offerStatusText(offer);
  const tone: PillTone = text === 'active' ? 'success' : text === 'paused' ? 'warning' : 'neutral';
  return <Pill label={text} tone={tone} />;
}
