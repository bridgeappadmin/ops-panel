import type { Request } from '@playwright/test';
import type { ReportRow } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const rows: ReportRow[] = [
  { venueId: 'b1', venueName: 'Café X', city: 'Bengaluru', fundedBy: 'tazmify', vouchers: 1200, connects: 48000, valueInr: 180000 },
  { venueId: 'b2', venueName: 'Bar Y', city: 'Pune', fundedBy: 'brand', vouchers: 3, connects: 120, valueInr: 450 },
];
const reportCalls = (calls: Request[]) => calls.filter((r) => r.method() === 'GET' && r.url().includes('/admin/reports/redemptions'));

test('defaults to the IST month', async ({ page }) => {
  await page.clock.setFixedTime('2026-10-31T19:00:00Z'); // 01:00 IST on 1 Nov
  const calls = await mockApi(page, { 'GET /admin/reports/redemptions': () => ok({ month: '2026-11', rows: [] }) });
  await signIn(page);
  await page.goto('/reports');
  await expect(page.getByLabel('Month')).toHaveValue('2026-11');
  await expect.poll(() => reportCalls(calls).map((r) => r.url().split('/api')[1])).toContain('/admin/reports/redemptions?month=2026-11');
  await expect(page.getByText('No redemptions this month.')).toBeVisible();
});

test('shows the per-venue table', async ({ page }) => {
  await mockApi(page, { 'GET /admin/reports/redemptions': () => ok({ month: '2026-11', rows }) });
  await signIn(page);
  await page.goto('/reports');
  const row = page.getByRole('row', { name: /Café X/ });
  await expect(row).toContainText('Bengaluru');
  await expect(row).toContainText('Tazmify');
  await expect(row).toContainText('1,200');
  await expect(row).toContainText('48,000');
  await expect(row).toContainText('₹1,80,000');
  await expect(page.getByRole('row', { name: /Bar Y/ })).toContainText('Brand');
});

test('downloads the CSV with the session', async ({ page }) => {
  await page.clock.setFixedTime('2026-10-31T19:00:00Z');
  const calls = await mockApi(page, {
    'GET /admin/reports/redemptions': (req) =>
      req.url().includes('format=csv')
        ? { body: '﻿Venue,City\r\nCafé X,Bengaluru\r\n', contentType: 'text/csv; charset=utf-8' }
        : ok({ month: '2026-11', rows }),
  });
  await signIn(page, { token: 't' });
  await page.goto('/reports');
  await expect(page.getByRole('row', { name: /Café X/ })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toBe('redemptions-2026-11.csv');
  const csv = reportCalls(calls).find((r) => r.url().includes('format=csv'))!;
  expect(csv.url()).toContain('month=2026-11&format=csv');
  expect(csv.headers().authorization).toBe('Bearer t');
});

test('sends an expired session to sign in from the CSV', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/reports/redemptions': (req) => (req.url().includes('format=csv') ? fail(401, 'Session expired') : ok({ month: '2026-11', rows })),
  });
  await signIn(page);
  await page.goto('/reports');
  await expect(page.getByRole('row', { name: /Café X/ })).toBeVisible();
  await page.getByRole('button', { name: 'Download CSV' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
