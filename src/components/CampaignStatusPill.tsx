import { Pill, type PillTone } from '@/components/ui';
import type { CampaignStatus, JobStatus } from '@/lib/types';

const TONE: Record<CampaignStatus | JobStatus, PillTone> = {
  draft: 'neutral', active: 'success', closed: 'warning', completed: 'success',
  hired: 'neutral', in_progress: 'success', completion_pending: 'warning', cancelled: 'neutral',
};

/** "in_progress" shows as "In progress". */
export function CampaignStatusPill({ status }: { status: CampaignStatus | JobStatus }) {
  const text = status.replace(/_/g, ' ');
  return <Pill label={text.charAt(0).toUpperCase() + text.slice(1)} tone={TONE[status]} />;
}
