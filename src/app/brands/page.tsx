'use client';

import { AppShell } from '@/components/AppShell';
import { ACCOUNT_FILTERS, StatusPill } from '@/components/AccountCard';
import { ListPage } from '@/components/ListPage';
import type { BrandRow } from '@/lib/types';

export default function BrandsPage() {
  return (
    <AppShell title="Brands">
      <ListPage<BrandRow>
        path="/admin/accounts/brands"
        filters={ACCOUNT_FILTERS}
        rowHref={(r) => `/brands/${r._id}`}
        columns={[
          { header: 'Name', cell: (r) => r.name ?? 'Unnamed' },
          { header: 'Username', cell: (r) => (r.username ? `@${r.username}` : '') },
          { header: 'Email', cell: (r) => r.email ?? '' },
          { header: 'City', cell: (r) => r.city ?? '' },
          { header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
        ]}
      />
    </AppShell>
  );
}
