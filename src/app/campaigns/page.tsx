'use client';

import { AppShell } from '@/components/AppShell';
import { CampaignStatusPill } from '@/components/CampaignStatusPill';
import { ListPage } from '@/components/ListPage';
import { formatIstDateTime } from '@/lib/format';
import type { CampaignRow, CampaignStatus } from '@/lib/types';

const FILTERS: { label: string; value: '' | CampaignStatus }[] = [
  { label: 'All', value: '' }, { label: 'Draft', value: 'draft' }, { label: 'Active', value: 'active' }, { label: 'Closed', value: 'closed' }, { label: 'Completed', value: 'completed' },
];

export default function CampaignsPage() {
  return (
    <AppShell title="Campaigns" description="Every campaign brands have posted, from draft to completed.">
      <ListPage<CampaignRow>
        path="/admin/campaigns"
        filters={FILTERS}
        rowHref={(r) => `/campaigns/${r._id}`}
        searchLabel="Search"
        columns={[
          { header: 'Title', cell: (r) => <span className="font-semibold">{r.title}</span> },
          { header: 'Brand', cell: (r) => r.brand?.name ?? 'Deleted account' },
          { header: 'Applications', align: 'right', cell: (r) => r.applications },
          { header: 'Status', cell: (r) => <CampaignStatusPill status={r.status} /> },
          { header: 'Created', cell: (r) => <span className="whitespace-nowrap text-ink-muted">{formatIstDateTime(r.createdAt)}</span> },
        ]}
      />
    </AppShell>
  );
}
