import type { Page } from '@playwright/test';
import type { AdminVoucher, Offer } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test, type Reply } from './helpers';

const FUTURE = '2099-01-01T12:00:00Z';
const offer = (over: Partial<Offer> = {}): Offer => ({
  _id: 'o1', brandId: 'b1', title: 'Free coffee', description: 'A cup on us', terms: 'One per person', deliverables: 'One story',
  address: '1 MG Road', location: { type: 'Point', coordinates: [77.59, 12.97] }, discountInr: 150, connectsCost: 40,
  totalCoupons: 20, remainingCoupons: 12, requirements: [{ platform: 'instagram', metric: 'followers', min: 1000 }],
  fundedBy: 'brand', voucherValidityDays: 7, startsAt: '2026-10-01T00:00:00Z', endsAt: FUTURE, status: 'active',
  createdBy: 'a', updatedBy: 'a', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
  venue: { _id: 'b1', name: 'Café X', city: 'Bengaluru' }, ...over,
});
const voucher = (over: Partial<AdminVoucher> = {}): AdminVoucher => ({
  _id: 'v1', number: 'TVABCD2345', status: 'active', offerId: 'o1', offerTitle: 'Free coffee', venueName: 'Café X', connectsCost: 40,
  discountInr: 150, fundedBy: 'brand', createdAt: '2026-10-26T12:00:00Z', expiresAt: '2026-11-02T12:00:00Z', redeemedAt: null,
  cancelledAt: null, cancelReason: null, creator: { _id: 'u1', name: 'Priya', username: 'priya' }, ...over,
});
const budget = { month: '2026-10', usedConnects: 32500, capConnects: 50000 };
const list = (results: Offer[]) => ok({ results, total: results.length, page: 1, totalPages: 1 });

test.describe('list', () => {
  test('shows the budget line and offers', async ({ page }) => {
    await mockApi(page, { 'GET /admin/budget': () => ok(budget), 'GET /admin/offers': () => list([offer()]) });
    await signIn(page);
    await page.goto('/offers');
    await expect(page.getByText('Tazmify-funded this month: 32,500 / 50,000 Connects')).toBeVisible();
    const row = page.getByRole('row', { name: /Café X/ });
    await expect(row).toContainText('Bengaluru');
    await expect(row).toContainText('12 / 20');
    await expect(row.getByRole('cell').nth(4)).toHaveText('Brand');
    await expect(row.getByRole('link', { name: 'Free coffee' })).toHaveAttribute('href', '/offers/o1');
    await expect(page.getByRole('link', { name: 'New offer' })).toHaveAttribute('href', '/offers/new');
  });

  test('filters by status', async ({ page }) => {
    const calls = await mockApi(page, { 'GET /admin/budget': () => ok(budget), 'GET /admin/offers': () => list([offer()]) });
    await signIn(page);
    await page.goto('/offers');
    await expect(page.getByText('Free coffee')).toBeVisible();
    await page.getByRole('button', { name: 'Paused' }).click();
    await expect.poll(() => calls.some((r) => r.method() === 'GET' && r.url().includes('/admin/offers?status=paused'))).toBe(true);
  });

  test('keeps a failed budget call on screen', async ({ page }) => {
    await mockApi(page, { 'GET /admin/budget': () => fail(500, 'Internal server error (rayId: AbC123)'), 'GET /admin/offers': () => list([offer()]) });
    await signIn(page);
    await page.goto('/offers');
    await expect(page.getByText('Free coffee')).toBeVisible();
    await page.getByRole('button', { name: 'Paused' }).click(); // a later list answer must not clear it
    await expect(page.getByText('Free coffee')).toBeVisible();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Internal server error (rayId: AbC123)');
  });

  test('shows an empty list plainly', async ({ page }) => {
    await mockApi(page, { 'GET /admin/budget': () => ok(budget), 'GET /admin/offers': () => list([]) });
    await signIn(page);
    await page.goto('/offers');
    await expect(page.getByText('No offers yet')).toBeVisible();
  });

  test('renders venue names as text', async ({ page }) => {
    const name = '<img src=x onerror=alert(1)>';
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs++; void d.dismiss(); });
    await mockApi(page, {
      'GET /admin/budget': () => ok(budget),
      'GET /admin/offers': () => list([offer({ venue: { _id: 'b1', name, city: 'Bengaluru' } })]),
    });
    await signIn(page);
    await page.goto('/offers');
    await expect(page.getByText(name)).toBeVisible();
    await page.waitForTimeout(300);
    expect(dialogs).toBe(0);
  });
});

test.describe('offer page', () => {
  test('pauses and resumes', async ({ page }) => {
    let status: Offer['status'] = 'active';
    const calls = await mockApi(page, {
      'GET /admin/offers/o1': () => ok({ offer: offer({ status }) }),
      'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [] }),
      'PATCH /admin/offers/o1': (req) => { status = req.postDataJSON().status; return ok({ offer: { ...offer({ status }), venue: undefined } }); },
    });
    await signIn(page);
    await page.goto('/offers/o1');
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    const patches = calls.filter((r) => r.method() === 'PATCH');
    expect(patches.map((r) => r.postDataJSON())).toEqual([{ status: 'paused' }, { status: 'active' }]);
  });

  test('ends only after confirming', async ({ page }) => {
    let status: Offer['status'] = 'active';
    const calls = await mockApi(page, {
      'GET /admin/offers/o1': () => ok({ offer: offer({ status }) }),
      'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [] }),
      'PATCH /admin/offers/o1': (req) => { status = req.postDataJSON().status; return ok({ offer: offer({ status }) }); },
    });
    await signIn(page);
    await page.goto('/offers/o1');
    const patches = () => calls.filter((r) => r.method() === 'PATCH');
    await page.getByRole('button', { name: 'End offer' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Keep offer' }).click();
    await expect(dialog).toBeHidden();
    expect(patches()).toHaveLength(0);
    await page.getByRole('button', { name: 'End offer' }).click();
    await dialog.getByRole('button', { name: 'End offer' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'End offer' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add coupons' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
    expect(patches().map((r) => r.postDataJSON())).toEqual([{ status: 'ended' }]);
  });

  test('adds coupons', async ({ page }) => {
    const calls = await mockApi(page, {
      'GET /admin/offers/o1': () => ok({ offer: offer() }),
      'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [] }),
      'PATCH /admin/offers/o1': () => ok({ offer: offer() }),
    });
    await signIn(page);
    await page.goto('/offers/o1');
    const patches = () => calls.filter((r) => r.method() === 'PATCH');
    await page.getByRole('button', { name: 'Add coupons' }).click();
    const dialog = page.getByRole('dialog');
    for (const bad of ['0', '10001']) {
      await dialog.getByLabel('Coupons to add').fill(bad);
      await dialog.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('1 to 10,000');
    }
    expect(patches()).toHaveLength(0);
    await dialog.getByLabel('Coupons to add').fill('5');
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(patches().map((r) => r.postDataJSON())).toEqual([{ addCoupons: 5 }]);
    // Reopened, it starts clean: no error left from the refused "10001".
    await page.getByRole('button', { name: 'Add coupons' }).click();
    await expect(dialog.getByLabel('Coupons to add')).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(dialog).toContainText('1 to 10,000');
  });

  test('shows why an action failed', async ({ page }) => {
    await mockApi(page, {
      'GET /admin/offers/o1': () => ok({ offer: offer() }),
      'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [] }),
      'PATCH /admin/offers/o1': () => fail(400, 'This offer has ended'),
    });
    await signIn(page);
    await page.goto('/offers/o1');
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'This offer has ended' })).toBeVisible();
  });

  test('lists the offer vouchers', async ({ page }) => {
    await mockApi(page, {
      'GET /admin/offers/o1': () => ok({ offer: offer() }),
      'GET /admin/offers/o1/vouchers': () => ok({
        vouchers: [
          voucher(),
          voucher({ _id: 'v2', number: 'TVREDEEM22', status: 'redeemed', redeemedAt: '2026-10-27T12:00:00Z' }),
          voucher({ _id: 'v3', number: 'TVCANCEL22', status: 'cancelled' }),
          voucher({ _id: 'v4', number: 'TVEXPIRE22', status: 'expired' }),
        ],
      }),
    });
    await signIn(page);
    await page.goto('/offers/o1');
    const row = page.getByRole('row', { name: /TVABCD2345/ });
    await expect(row).toContainText('Priya');
    await expect(row).toContainText('active');
    await expect(row).toContainText('26 Oct, 5:30 PM');
    await expect(row.getByRole('button', { name: 'Cancel & refund' })).toBeVisible();
    await expect(page.getByRole('row', { name: /TVREDEEM22/ }).getByRole('button', { name: 'Cancel & refund' })).toBeVisible();
    await expect(page.getByRole('row', { name: /TVCANCEL22/ }).getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('row', { name: /TVEXPIRE22/ }).getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/offers/o1/edit');
  });

  // Mocks one active voucher; `reply` answers the cancel POST. After it, the voucher reads cancelled and its coupon
  // is back on the offer (12 left of 20 becomes 13).
  async function cancelSetup(page: Page, reply: () => Reply | Promise<Reply>) {
    let cancelled = false;
    const calls = await mockApi(page, {
      'GET /admin/offers/o1': () => ok({ offer: offer({ remainingCoupons: cancelled ? 13 : 12 }) }),
      'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [voucher({ status: cancelled ? 'cancelled' : 'active' })] }),
      'POST /admin/vouchers/v1/cancel': () => { cancelled = true; return reply(); },
    });
    await signIn(page);
    await page.goto('/offers/o1');
    await page.getByRole('button', { name: 'Cancel & refund' }).click();
    return calls;
  }

  test('cancels and refunds with a reason, then refetches the offer', async ({ page }) => {
    const calls = await cancelSetup(page, () => ok({ voucher: voucher({ status: 'cancelled' }) }));
    const dialog = page.getByRole('dialog');
    const posts = () => calls.filter((r) => r.method() === 'POST');
    await expect(page.getByText('12 left of 20')).toBeVisible();
    await dialog.getByLabel('Reason').fill('ab');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(dialog.getByRole('alert')).toContainText('3-300 characters');
    expect(posts()).toHaveLength(0);
    await dialog.getByLabel('Reason').fill('  Venue did not give the discount  ');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(page.getByRole('main').getByRole('status')).toHaveText('Voucher cancelled and refunded');
    await expect(page.getByRole('row', { name: /TVABCD2345/ })).toContainText('cancelled');
    await expect(page.getByRole('button', { name: 'Cancel & refund' })).toHaveCount(0);
    expect(posts().map((r) => r.postDataJSON())).toEqual([{ reason: 'Venue did not give the discount' }]);
    // The coupon came back: the offer is fetched again after the cancel, and its count moves.
    await expect(page.getByText('13 left of 20')).toBeVisible();
    const after = calls.slice(calls.indexOf(posts()[0]) + 1);
    expect(after.some((r) => r.method() === 'GET' && r.url().endsWith('/api/admin/offers/o1'))).toBe(true);
  });

  test('refetches after a partial refund', async ({ page }) => {
    await cancelSetup(page, () => fail(500, 'Voucher cancelled but not fully refunded — see the server log'));
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Venue did not give the discount');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Voucher cancelled but not fully refunded — see the server log');
    await expect(page.getByRole('row', { name: /TVABCD2345/ })).toContainText('cancelled');
    await expect(page.getByText('13 left of 20')).toBeVisible();
  });

  test('keeps the dialog open and shows a refused cancel', async ({ page }) => {
    await cancelSetup(page, () => fail(400, "This voucher can't be cancelled"));
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Venue did not give the discount');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(dialog.getByRole('alert')).toContainText("This voucher can't be cancelled");
  });

  test('keeps the dialog open on Esc while the cancel is in flight', async ({ page }) => {
    let answer = () => {};
    const answered = new Promise<void>((resolve) => { answer = resolve; });
    const calls = await cancelSetup(page, async () => { await answered; return fail(400, "This voucher can't be cancelled"); });
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Venue did not give the discount');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect.poll(() => calls.some((r) => r.method() === 'POST')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    answer();
    await expect(dialog.getByRole('alert')).toHaveText("This voucher can't be cancelled");
    await expect(dialog).toBeVisible();
    // Idle again, Esc closes it.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('cancels once on a double click', async ({ page }) => {
    const calls = await cancelSetup(page, () => ok({ voucher: voucher({ status: 'cancelled' }) }));
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Venue did not give the discount');
    await dialog.getByRole('button', { name: 'Confirm refund' }).dblclick();
    await expect(page.getByText('Voucher cancelled and refunded')).toBeVisible();
    expect(calls.filter((r) => r.method() === 'POST')).toHaveLength(1);
  });
});

test.describe('scheduled', () => {
  const future = offer({ startsAt: '2099-01-01T00:00:00Z', endsAt: '2099-02-01T00:00:00Z' });
  test('the list says when a future offer starts', async ({ page }) => {
    await mockApi(page, { 'GET /admin/budget': () => ok(budget), 'GET /admin/offers': () => list([future]) });
    await signIn(page);
    await page.goto('/offers');
    await expect(page.getByRole('row', { name: /Café X/ })).toContainText('Scheduled · starts 1 Jan, 5:30 AM');
  });

  test('the offer page says when it starts', async ({ page }) => {
    await mockApi(page, { 'GET /admin/offers/o1': () => ok({ offer: future }), 'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [] }) });
    await signIn(page);
    await page.goto('/offers/o1');
    await expect(page.getByText('Scheduled · starts 1 Jan, 5:30 AM')).toBeVisible();
  });
});
