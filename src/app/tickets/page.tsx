'use client';

import { AppShell } from '@/components/AppShell';
import { ListPage } from '@/components/ListPage';
import { TicketStatusPill } from '@/components/TicketStatusPill';
import { formatIstDateTime } from '@/lib/format';
import type { TicketRow } from '@/lib/types';

const FILTERS = [
  { label: 'All', value: '' }, { label: 'Open', value: 'open' }, { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' }, { label: 'Closed', value: 'closed' },
];

/** Oldest first: the server sorts it. */
export default function TicketsPage() {
  return (
    <AppShell title="Support">
      <ListPage<TicketRow>
        path="/admin/tickets"
        hideSearch
        filters={FILTERS}
        rowHref={(r) => `/tickets/${r._id}`}
        columns={[
          { header: 'Subject', cell: (r) => r.subject },
          { header: 'From', cell: (r) => r.user?.name ?? 'Deleted account' },
          { header: 'Status', cell: (r) => <TicketStatusPill status={r.status} /> },
          { header: 'Opened', cell: (r) => formatIstDateTime(r.createdAt) },
        ]}
      />
    </AppShell>
  );
}
