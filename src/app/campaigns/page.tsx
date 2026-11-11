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
    <AppShell title="Campaigns">
      <ListPage<CampaignRow>
        path="/admin/campaigns"
        filters={FILTERS}
        rowHref={(r) => `/campaigns/${r._id}`}
        searchLabel="Search"
        columns={[
          { header: 'Title', cell: (r) => r.title },
          { header: 'Brand', cell: (r) => r.brand?.name ?? 'Deleted account' },
          { header: 'Applications', cell: (r) => r.applications },
          { header: 'Status', cell: (r) => <CampaignStatusPill status={r.status} /> },
          { header: 'Created', cell: (r) => formatIstDateTime(r.createdAt) },
        ]}
      />
    </AppShell>
  );
}
