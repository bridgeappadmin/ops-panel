'use client';

import { AppShell } from '@/components/AppShell';
import { ACCOUNT_FILTERS, StatusPill } from '@/components/AccountCard';
import { ListPage, Who } from '@/components/ListPage';
import { formatIstDateTime, formatNumber } from '@/lib/format';
import type { CreatorRow } from '@/lib/types';

export default function CreatorsPage() {
  return (
    <AppShell title="Creators" description="Everyone who signed up to create. Open one for their socials, Connects and history.">
      <ListPage<CreatorRow>
        path="/admin/accounts/creators"
        filters={ACCOUNT_FILTERS}
        rowHref={(r) => `/creators/${r._id}`}
        columns={[
          { header: 'Creator', cell: (r) => <Who name={r.name ?? 'Unnamed'} sub={r.username ? `@${r.username}` : undefined} src={r.profilePicture} /> },
          { header: 'Email', cell: (r) => <span className="text-ink-muted">{r.email ?? ''}</span> },
          { header: 'Followers', align: 'right', cell: (r) => formatNumber(r.totalFollowers ?? 0) },
          { header: 'Connects', align: 'right', cell: (r) => formatNumber(r.connectsBalance ?? 0) },
          { header: 'Joined', cell: (r) => <span className="whitespace-nowrap text-ink-muted">{formatIstDateTime(r.createdAt)}</span> },
          { header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
        ]}
      />
    </AppShell>
  );
}
