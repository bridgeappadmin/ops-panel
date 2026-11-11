'use client';

import { AppShell } from '@/components/AppShell';
import { ListPage, Who } from '@/components/ListPage';
import { TicketStatusPill } from '@/components/TicketStatusPill';
import { formatIstDateTime } from '@/lib/format';
import type { TicketRow } from '@/lib/types';

const FILTERS = [
  { label: 'All', value: '' }, { label: 'Open', value: 'open' }, { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' }, { label: 'Closed', value: 'closed' },
];

/** Oldest open first: the server sorts oldest first, and the page opens on the Open filter. */
export default function TicketsPage() {
  return (
    <AppShell title="Support" description="Messages from creators and brands. The oldest open tickets come first.">
      <ListPage<TicketRow>
        path="/admin/tickets"
        hideSearch
        filters={FILTERS}
        initialStatus="open"
        rowHref={(r) => `/tickets/${r._id}`}
        columns={[
          { header: 'Subject', cell: (r) => <span className="font-semibold">{r.subject}</span> },
          { header: 'From', cell: (r) => <Who name={r.user?.name ?? 'Deleted account'} sub={r.userRole === 'brand' ? 'Brand' : 'Creator'} /> },
          { header: 'Status', cell: (r) => <TicketStatusPill status={r.status} /> },
          { header: 'Opened', cell: (r) => <span className="whitespace-nowrap text-ink-muted">{formatIstDateTime(r.createdAt)}</span> },
        ]}
      />
    </AppShell>
  );
}
