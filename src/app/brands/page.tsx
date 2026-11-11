'use client';

import { AppShell } from '@/components/AppShell';
import { ACCOUNT_FILTERS, StatusPill } from '@/components/AccountCard';
import { ListPage, Who } from '@/components/ListPage';
import type { BrandRow } from '@/lib/types';

export default function BrandsPage() {
  return (
    <AppShell title="Brands" description="Businesses and venues on Tazmify. Open one for their campaigns, reviews and history.">
      <ListPage<BrandRow>
        path="/admin/accounts/brands"
        filters={ACCOUNT_FILTERS}
        rowHref={(r) => `/brands/${r._id}`}
        columns={[
          { header: 'Brand', cell: (r) => <Who name={r.name ?? 'Unnamed'} sub={r.username ? `@${r.username}` : undefined} /> },
          { header: 'Email', cell: (r) => <span className="text-ink-muted">{r.email ?? ''}</span> },
          { header: 'City', cell: (r) => r.city ?? '' },
          { header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
        ]}
      />
    </AppShell>
  );
}
