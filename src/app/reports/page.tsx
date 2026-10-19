'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Field, Skeleton } from '@/components/ui';
import { api, apiBlob } from '@/lib/api';
import { saveBlob } from '@/lib/download';
import { currentIstMonth, formatNumber } from '@/lib/format';
import { fundedByLabel } from '@/lib/offers';
import type { RedemptionReport } from '@/lib/types';

export default function ReportsPage() {
  return (
    <AppShell title="Monthly redemptions">
      <Report />
    </AppShell>
  );
}

function Report() {
  const [month, setMonth] = useState(currentIstMonth);
  const [report, setReport] = useState<RedemptionReport | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!month) return;
    let current = true;
    api<RedemptionReport>(`/admin/reports/redemptions?month=${month}`).then(
      (r) => { if (current) { setReport(r); setError(''); } },
      (e: Error) => { if (current) setError(e.message); },
    );
    return () => { current = false; };
  }, [month]);

  async function download() {
    setDownloading(true);
    setError('');
    try {
      saveBlob(await apiBlob(`/admin/reports/redemptions?month=${month}&format=csv`), `redemptions-${month}.csv`);
    } catch (e) { setError((e as Error).message); } finally { setDownloading(false); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Month" type="month" value={month} onChange={(e) => { setError(''); setReport(null); setMonth(e.target.value); }} />
          <Button variant="secondary" loading={downloading} disabled={!month} onClick={download}>Download CSV</Button>
        </div>
      </Card>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      {!month ? null : report === null ? (
        !error && <Skeleton className="h-40 w-full" />
      ) : report.rows.length === 0 ? (
        <Card><p className="text-ink-muted">No redemptions this month.</p></Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead className="text-caption-sb text-ink-muted">
                <tr>
                  {['Venue', 'City', 'Funded by', 'Vouchers', 'Connects', 'Value'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={`${r.venueId}-${r.fundedBy}`} className="border-t border-line">
                    <td className="px-4 py-3">{r.venueName}</td>
                    <td className="px-4 py-3">{r.city}</td>
                    <td className="px-4 py-3">{fundedByLabel(r.fundedBy)}</td>
                    <td className="px-4 py-3">{formatNumber(r.vouchers)}</td>
                    <td className="px-4 py-3">{formatNumber(r.connects)}</td>
                    <td className="px-4 py-3">₹{formatNumber(r.valueInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
