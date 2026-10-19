import { Pill, type PillTone } from '@/components/ui';
import type { VoucherStatus } from '@/lib/types';

const TONE: Record<VoucherStatus, PillTone> = { active: 'success', redeemed: 'violet', expired: 'neutral', cancelled: 'danger' };

export function VoucherStatusPill({ status }: { status: VoucherStatus }) {
  return <Pill label={status} tone={TONE[status]} />;
}
