import { Card, Pill } from '@/components/ui';
import { formatIstDateTime } from '@/lib/format';
import type { AccountReportRow, AdminActionView } from '@/lib/types';

/** An account's panel history as a timeline, newest first as the server sends it. */
export function History({ rows }: { rows: AdminActionView[] }) {
  return (
    <Card>
      <h2 className="font-display text-h4">History</h2>
      <p className="text-small text-ink-muted">What the team did here</p>
      {rows.length === 0 ? <p className="mt-4 text-ink-muted">No admin actions yet.</p> : (
        <ol className="mt-5">
          {rows.map((r, i) => (
            <li key={r._id} className="flex gap-3.5 pb-5 last:pb-0">
              <span aria-hidden className="flex flex-col items-center">
                <span className="mt-1.5 size-2.5 rounded-pill bg-violet" />
                {i < rows.length - 1 ? <span className="mt-1 w-0.5 flex-1 bg-line" /> : null}
              </span>
              <div className="min-w-0">
                <p className="text-body-sb">{r.action}</p>
                {r.details ? <p className="text-small break-words text-ink-muted">{r.details}</p> : null}
                <p className="mt-0.5 text-caption text-ink-muted">{r.admin?.name ?? 'Former admin'} · {formatIstDateTime(r.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Reports filed against an account or campaign, with their outcome. */
export function Reports({ rows, subject }: { rows: AccountReportRow[]; subject: string }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-h4">Reports</h2>
        <span className="text-small text-ink-muted">{rows.length}</span>
      </div>
      {rows.length === 0 ? <p className="mt-3 text-ink-muted">No reports against {subject}.</p> : (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((r) => (
            <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                <span className="block text-body-sb first-letter:uppercase">{r.reason}</span>
                <span className="block text-caption text-ink-muted">{formatIstDateTime(r.createdAt)}{r.resolution && r.resolution !== 'none' ? ` · ${r.resolution.replace(/_/g, ' ')}` : ''}</span>
              </span>
              <Pill label={r.status} tone={r.status === 'pending' ? 'warning' : r.status === 'reviewing' ? 'violet' : 'neutral'} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
