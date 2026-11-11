'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { CampaignStatusPill } from '@/components/CampaignStatusPill';
import { ListPage } from '@/components/ListPage';
import { formatIstDateTime } from '@/lib/format';
import type { JobRow, JobStatus } from '@/lib/types';

const FILTERS: { label: string; value: '' | JobStatus }[] = [
  { label: 'All', value: '' }, { label: 'Hired', value: 'hired' }, { label: 'In progress', value: 'in_progress' },
  { label: 'Completion pending', value: 'completion_pending' }, { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
];
const link = (href: string, text: string) => <Link href={href} className="text-violet hover:underline">{text}</Link>;

function JobsTable() {
  return (
    <ListPage<JobRow>
      path="/admin/jobs"
      filters={FILTERS}
      // The first column is the row's own link; the party columns carry their own, so it is the date and the row falls back to /jobs.
      rowHref={(r) => (r.campaign ? `/campaigns/${r.campaign._id}` : '/jobs')}
      columns={[
        { header: 'Created', cell: (r) => formatIstDateTime(r.createdAt) },
        { header: 'Campaign', cell: (r) => (r.campaign ? link(`/campaigns/${r.campaign._id}`, r.campaign.title) : 'Deleted campaign') },
        { header: 'Creator', cell: (r) => (r.creator ? link(`/creators/${r.creator._id}`, r.creator.name) : 'Deleted account') },
        { header: 'Brand', cell: (r) => (r.brand ? link(`/brands/${r.brand._id}`, r.brand.name) : 'Deleted account') },
        { header: 'Status', cell: (r) => <CampaignStatusPill status={r.status} /> },
      ]}
    />
  );
}

export default function JobsPage() {
  return <AppShell title="Jobs"><JobsTable /></AppShell>;
}
