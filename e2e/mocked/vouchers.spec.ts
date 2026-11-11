import type { AdminVoucher } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const voucher = (over: Partial<AdminVoucher> = {}): AdminVoucher => ({
  _id: 'v1', number: 'TVABCD2345', status: 'active', offerId: 'o1', offerTitle: 'Free coffee', venueName: 'Café X', connectsCost: 40,
  discountInr: 1500, fundedBy: 'brand', createdAt: '2026-10-26T12:00:00Z', expiresAt: '2026-11-02T12:00:00Z', redeemedAt: null,
  cancelledAt: null, cancelReason: null, creator: { _id: 'u1', name: 'Priya', username: 'priya' }, ...over,
});
const numbers = (calls: { method(): string; url(): string }[]) =>
  calls.filter((r) => r.method() === 'GET' && r.url().includes('/admin/vouchers?')).map((r) => new URL(r.url()).searchParams.get('number'));

test('looks up a voucher by number', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/vouchers': () => ok({ voucher: voucher({ status: 'redeemed', redeemedAt: '2026-10-27T13:00:00Z' }) }) });
  await signIn(page);
  await page.goto('/vouchers');
  await page.getByLabel('Voucher number').fill(' tvabcd2345 ');
  await page.getByRole('button', { name: 'Look up' }).click();
  const details = page.getByRole('region', { name: 'Voucher details' });
  await expect(details).toContainText('TVABCD2345');
  await expect(details).toContainText('redeemed');
  await expect(details).toContainText('Free coffee');
  await expect(details).toContainText('Café X');
  await expect(details).toContainText('40');
  await expect(details).toContainText('₹1,500');
  await expect(details.getByRole('definition').nth(5)).toHaveText('Brand');
  await expect(details).toContainText('Priya');
  await expect(details).toContainText('26 Oct, 5:30 PM'); // created, in IST
  await expect(details).toContainText('27 Oct, 6:30 PM'); // redeemed
  expect(numbers(calls)).toEqual(['tvabcd2345']);
});

test('says when a voucher is not found', async ({ page }) => {
  await mockApi(page, { 'GET /admin/vouchers': () => fail(404, 'Voucher not found') });
  await signIn(page);
  await page.goto('/vouchers');
  await page.getByLabel('Voucher number').fill('TVABCD2345');
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByText('Voucher not found')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Voucher details' })).toHaveCount(0);
});

test('cancels from the lookup and refreshes it', async ({ page }) => {
  let cancelled = false;
  const calls = await mockApi(page, {
    'GET /admin/vouchers': () => ok({ voucher: voucher(cancelled ? { status: 'cancelled', cancelledAt: '2026-10-28T10:00:00Z', cancelReason: 'Duplicate' } : {}) }),
    'POST /admin/vouchers/v1/cancel': () => { cancelled = true; return ok({ voucher: voucher({ status: 'cancelled' }) }); },
  });
  await signIn(page);
  await page.goto('/vouchers');
  const input = page.getByLabel('Voucher number');
  await input.fill('TVABCD2345');
  await page.getByRole('button', { name: 'Look up' }).click();
  await page.getByRole('button', { name: 'Cancel & refund' }).click();
  await input.fill('TVOTHER999'); // edited after the lookup: the refetch must still use the looked-up number
  await page.getByLabel('Reason').fill('Duplicate');
  await page.getByRole('button', { name: 'Confirm refund' }).click();
  await expect(page.getByRole('main').getByRole('status')).toHaveText('Voucher cancelled and refunded');
  await expect(page.getByRole('region', { name: 'Voucher details' })).toContainText('cancelled');
  await expect(page.getByRole('region', { name: 'Voucher details' })).toContainText('Duplicate');
  await expect(page.getByRole('button', { name: 'Cancel & refund' })).toHaveCount(0);
  expect(numbers(calls)).toEqual(['TVABCD2345', 'TVABCD2345']);
});

test('shows a partial refund as an alert and refreshes', async ({ page }) => {
  let cancelled = false;
  await mockApi(page, {
    'GET /admin/vouchers': () => ok({ voucher: voucher(cancelled ? { status: 'cancelled', cancelledAt: '2026-10-28T10:00:00Z', cancelReason: 'Duplicate' } : {}) }),
    'POST /admin/vouchers/v1/cancel': () => { cancelled = true; return fail(500, 'Voucher cancelled but not fully refunded — see the server log'); },
  });
  await signIn(page);
  await page.goto('/vouchers');
  await page.getByLabel('Voucher number').fill('TVABCD2345');
  await page.getByRole('button', { name: 'Look up' }).click();
  await page.getByRole('button', { name: 'Cancel & refund' }).click();
  await page.getByLabel('Reason').fill('Duplicate');
  await page.getByRole('button', { name: 'Confirm refund' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Voucher cancelled but not fully refunded — see the server log');
  await expect(page.getByRole('region', { name: 'Voucher details' })).toContainText('cancelled');
});

test('a number in the URL (from Jump to) fills the field and is looked up', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/vouchers': () => ok({ voucher: voucher() }) });
  await signIn(page);
  await page.goto('/vouchers?number=TVABCD2345');
  await expect(page.getByRole('region', { name: 'Voucher details' })).toContainText('Free coffee');
  await expect(page.getByLabel('Voucher number')).toHaveValue('TVABCD2345');
  expect(numbers(calls)).toEqual(['TVABCD2345']);
});

test('Jump to opens a section by name, or a voucher by number', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/vouchers': () => ok({ voucher: voucher() }),
    'GET /admin/reports/redemptions': () => ok({ month: '2026-11', rows: [] }),
  });
  await signIn(page, { role: 'ops' });
  await page.goto('/vouchers');
  const jump = page.getByRole('search').getByRole('combobox');
  await page.keyboard.press('Control+k');
  await expect(jump).toBeFocused();
  await jump.fill('tvabcd2345');
  await jump.press('Enter');
  await expect(page).toHaveURL('/vouchers?number=tvabcd2345');
  await expect(page.getByRole('region', { name: 'Voucher details' })).toBeVisible();
  await jump.fill('repo');
  await jump.press('Enter');
  await expect(page).toHaveURL('/reports');
});
