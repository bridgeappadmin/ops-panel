import { Pill, type PillTone } from '@/components/ui';
import type { TicketStatus } from '@/lib/types';

const TONE: Record<TicketStatus, PillTone> = { open: 'warning', in_progress: 'violet', resolved: 'success', closed: 'neutral' };
export const TICKET_STATUSES: { label: string; value: TicketStatus }[] = [
  { label: 'Open', value: 'open' }, { label: 'In progress', value: 'in_progress' }, { label: 'Resolved', value: 'resolved' }, { label: 'Closed', value: 'closed' },
];

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  return <Pill label={TICKET_STATUSES.find((s) => s.value === status)?.label ?? status} tone={TONE[status]} />;
}
