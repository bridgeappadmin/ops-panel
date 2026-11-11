'use client';

import { AppShell } from '@/components/AppShell';
import { ACCOUNT_FILTERS, StatusPill } from '@/components/AccountCard';
import { ListPage } from '@/components/ListPage';
import { formatNumber } from '@/lib/format';
import type { CreatorRow } from '@/lib/types';

export default function CreatorsPage() {
  return (
    <AppShell title="Creators">
      <ListPage<CreatorRow>
        path="/admin/accounts/creators"
        filters={ACCOUNT_FILTERS}
        rowHref={(r) => `/creators/${r._id}`}
        columns={[
          { header: 'Name', cell: (r) => r.name ?? 'Unnamed' },
          { header: 'Username', cell: (r) => (r.username ? `@${r.username}` : '') },
          { header: 'Email', cell: (r) => r.email ?? '' },
          { header: 'Followers', cell: (r) => formatNumber(r.totalFollowers ?? 0) },
          { header: 'Connects', cell: (r) => formatNumber(r.connectsBalance ?? 0) },
          { header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
        ]}
      />
    </AppShell>
  );
}
