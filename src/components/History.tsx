import { Card } from '@/components/ui';
import { formatIstDateTime } from '@/lib/format';
import type { AdminActionView } from '@/lib/types';

/** An account's panel history, newest first as the server sends it. */
export function History({ rows }: { rows: AdminActionView[] }) {
  return (
    <Card>
      <h2 className="font-display text-h3">History</h2>
      {rows.length === 0 ? <p className="mt-2 text-ink-muted">No admin actions yet.</p> : (
        <ul className="mt-3 space-y-3">
          {rows.map((r) => (
            <li key={r._id}>
              <p className="text-body-sb">{r.action}</p>
              {r.details ? <p className="text-body text-ink-muted">{r.details}</p> : null}
              <p className="text-caption text-ink-muted">{r.admin?.name ?? 'Former admin'} · {formatIstDateTime(r.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
