'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Field, Icon, Skeleton, Stats, Table, Td, Th } from '@/components/ui';
import { api, apiBlob } from '@/lib/api';
import { saveBlob } from '@/lib/download';
import { currentIstMonth, formatNumber } from '@/lib/format';
import { fundedByLabel } from '@/lib/offers';
import type { RedemptionReport } from '@/lib/types';

export default function ReportsPage() {
  return (
    <AppShell title="Monthly redemptions" description="Vouchers redeemed per venue in a month, with Connects and value, ready to download for finance.">
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

  const total = (k: 'vouchers' | 'connects' | 'valueInr') => (report?.rows ?? []).reduce((n, r) => n + r[k], 0);
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Month" type="month" value={month} className="w-full sm:w-60" onChange={(e) => { setError(''); setReport(null); setMonth(e.target.value); }} />
        <Button variant="secondary" loading={downloading} disabled={!month} onClick={download}><Icon name="download" size={16} />Download CSV</Button>
      </Card>
      {error ? <p role="alert" className="text-danger-ink">{error}</p> : null}
      {!month ? null : report === null ? (
        !error && <Skeleton className="h-40 w-full" />
      ) : report.rows.length === 0 ? (
        <Card><p className="py-8 text-center text-ink-muted">No redemptions this month.</p></Card>
      ) : (
        <>
          <Stats items={[
            { label: 'Venues', value: formatNumber(report.rows.length) },
            { label: 'Vouchers redeemed', value: formatNumber(total('vouchers')) },
            { label: 'Connects', value: formatNumber(total('connects')) },
            { label: 'Value', value: `₹${formatNumber(total('valueInr'))}` },
          ]} />
          <Card padded={false}>
            <Table>
              <thead><tr>{['Venue', 'City', 'Funded by', 'Vouchers', 'Connects', 'Value'].map((h, i) => <Th key={h} className={i > 2 ? 'text-right' : ''}>{h}</Th>)}</tr></thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={`${r.venueId}-${r.fundedBy}`}>
                    <Td className="font-semibold">{r.venueName}</Td>
                    <Td>{r.city}</Td>
                    <Td>{fundedByLabel(r.fundedBy)}</Td>
                    <Td className="text-right">{formatNumber(r.vouchers)}</Td>
                    <Td className="text-right">{formatNumber(r.connects)}</Td>
                    <Td className="text-right">₹{formatNumber(r.valueInr)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
