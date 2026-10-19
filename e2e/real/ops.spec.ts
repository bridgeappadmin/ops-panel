import { readFileSync } from 'node:fs';
import { test as base, expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { seed as loadSeed, SERVER_URL, type E2eSeed } from './global-setup';

// Fails a test on an uncaught error in a page, or a 5xx from the server, even where the page didn't show it.
let problems: string[] = [];
function watch(page: Page) {
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('response', (res) => { if (res.status() >= 500) problems.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
}
const test = base.extend<{ guard: void }>({
  guard: [async ({ page }, use) => {
    problems = [];
    watch(page);
    await use();
    expect(problems).toEqual([]);
  }, { auto: true }],
});

// One scenario against the real server, in order: every test builds on the state the ones before it left.
// Admin sign-ins are limited to 5 per 15 minutes per server process, so only the 5 that the scenario is about go
// through the form (wrong password, superadmin, ops, ops after the reset, disabled ops). Every other page reuses
// the superadmin session from the second test.
test.describe.configure({ mode: 'serial' });

type AdminSession = { token: string; role: string; name: string };
const DAY = 86_400_000;
const OPS2 = { name: 'E2E Ops Two', email: 'ops2@tazmify-e2e.test', password: 'e2e-ops2-temp-password', newPassword: 'e2e-ops2-new-password' };
const FIRST = { title: 'Dinner for two', newTitle: 'Dinner for two, dessert on us' };
const SECOND = { title: 'Coffee and cake' };

let seed: E2eSeed;
let server: APIRequestContext;
let superadmin: AdminSession;
let offerId: string;
let offer2Id: string;
let voucher: { _id: string; number: string };

test.beforeAll(async () => {
  seed = loadSeed();
  server = await request.newContext({ baseURL: SERVER_URL });
});
test.afterAll(() => server.dispose());

/** A direct call to the server, as the creator app, the venue app or an admin would make it. */
async function call(method: string, path: string, token: string, data?: unknown) {
  const res = await server.fetch(path, { method, headers: { Authorization: `Bearer ${token}` }, data });
  return { status: res.status(), body: await res.json() };
}
const balance = async () => (await call('GET', '/creator/connects', seed.creator.token)).body.data.balance as number;
const getOffer = async (id: string) => (await call('GET', `/admin/offers/${id}`, superadmin.token)).body.data.offer;

/** Signs the page in as the superadmin without the form, as a reload would find it. */
async function asSuperadmin(page: Page) {
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('ops.token')) return;
    sessionStorage.setItem('ops.token', s.token);
    sessionStorage.setItem('ops.role', s.role);
    sessionStorage.setItem('ops.name', s.name);
  }, superadmin);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** datetime-local wants the browser's local time; the browser and this process share the machine's time zone. */
const localInput = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
// '26 Oct, 5:30 PM'
const IST = /\d{1,2} [A-Z][a-z]{2}, \d{1,2}:\d{2} [AP]M/;
const istMonth = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 7);

/** Creates an offer at Café X through the form; it starts a minute ago, so creators can claim it at once. */
async function createOffer(page: Page, o: { title: string; discount: number; cost: number; coupons: number; funder: 'Tazmify' | 'Brand'; minFollowers?: number }) {
  await page.goto('/offers/new');
  await page.getByLabel('Search venues').fill('Caf');
  await page.getByRole('button', { name: /Café X/ }).click();
  await expect(page.getByText('Venue: Café X (@cafex) Bengaluru 919800000001')).toBeVisible();
  await expect(page.getByLabel('Coordinates (lat, lng)')).toHaveValue('12.9716, 77.5946');
  await page.getByLabel('Title', { exact: true }).fill(o.title);
  await page.getByLabel('Description', { exact: true }).fill(`${o.title} at Café X.`);
  await page.getByLabel('Terms and conditions', { exact: true }).fill('One voucher per table. Not valid with other offers.');
  await page.getByLabel('Address', { exact: true }).fill('12 MG Road, Bengaluru');
  await page.getByLabel('Discount (₹)').fill(String(o.discount));
  await page.getByLabel('Cost (Connects)').fill(String(o.cost));
  await page.getByLabel('Coupons', { exact: true }).fill(String(o.coupons));
  await page.getByRole('radio', { name: o.funder }).check();
  await page.getByLabel('Starts', { exact: true }).fill(localInput(Date.now() - 60_000));
  await page.getByLabel('Ends', { exact: true }).fill(localInput(Date.now() + 7 * DAY));
  if (o.minFollowers !== undefined) {
    await page.getByRole('button', { name: 'Add requirement' }).click();
    await page.getByLabel('Platform 1').selectOption('instagram');
    await page.getByLabel('Metric 1').selectOption('followers');
    await page.getByLabel('Minimum 1').fill(String(o.minFollowers));
  }
  await page.getByRole('button', { name: 'Create offer' }).click();
  await expect(page).toHaveURL(/\/offers\/[0-9a-f]{24}$/);
  await expect(page.getByRole('heading', { level: 1, name: o.title })).toBeVisible();
  return page.url().split('/').pop()!;
}

test('refuses a wrong password', async ({ page }) => {
  await signIn(page, seed.superadmin.email, 'not-the-password');
  await expect(page.getByLabel('Password')).toHaveAccessibleDescription('Invalid moderator credentials');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem('ops.token'))).toBeNull();
});

test('signs in and shows the empty budget', async ({ page }) => {
  await signIn(page, seed.superadmin.email, seed.superadmin.password);
  await expect(page).toHaveURL(/\/offers$/);
  await expect(page.getByText('Tazmify-funded this month: 0 / 50,000 Connects')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admins' })).toBeVisible();
  superadmin = await page.evaluate(() => ({
    token: sessionStorage.getItem('ops.token')!, role: sessionStorage.getItem('ops.role')!, name: sessionStorage.getItem('ops.name')!,
  }));
  expect(superadmin).toMatchObject({ role: 'superadmin', name: 'E2E Superadmin' });
});

test('creates a Tazmify-funded offer', async ({ page }) => {
  await asSuperadmin(page);
  offerId = await createOffer(page, { title: FIRST.title, discount: 1000, cost: 500, coupons: 20, funder: 'Tazmify', minFollowers: 3000 });

  expect(await getOffer(offerId)).toMatchObject({
    title: FIRST.title, brandId: seed.brand.id, venue: { name: 'Café X', city: 'Bengaluru' }, status: 'active', fundedBy: 'tazmify',
    discountInr: 1000, connectsCost: 500, totalCoupons: 20, remainingCoupons: 20, voucherValidityDays: 7,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] }, requirements: [{ platform: 'instagram', metric: 'followers', min: 3000 }],
  });

  await page.goto('/offers');
  const row = page.getByRole('row', { name: new RegExp(FIRST.title) });
  await expect(row.getByRole('cell')).toHaveText(['Café XBengaluru', FIRST.title, 'active', '20 / 20', 'tazmify', new RegExp(`^${IST.source} to ${IST.source}$`)]);
});

test('edits, pauses, resumes and adds coupons', async ({ page }) => {
  await asSuperadmin(page);
  const before = await getOffer(offerId);

  await page.goto(`/offers/${offerId}`);
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(FIRST.title);
  await page.getByLabel('Title', { exact: true }).fill(FIRST.newTitle);
  const patch = page.waitForRequest((r) => r.method() === 'PATCH');
  await page.getByRole('button', { name: 'Save changes' }).click();
  expect((await patch).postDataJSON()).toEqual({ title: FIRST.newTitle });
  await expect(page).toHaveURL(new RegExp(`/offers/${offerId}$`));
  await expect(page.getByRole('heading', { level: 1, name: FIRST.newTitle })).toBeVisible();

  // Only the title (and its updatedAt stamp) moved on the server.
  const after = await getOffer(offerId);
  expect(after.title).toBe(FIRST.newTitle);
  const rest = (o: object) => ({ ...o, title: undefined, updatedAt: undefined });
  expect(rest(after)).toEqual(rest(before));

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('paused', { exact: true })).toBeVisible();
  const refused = await call('POST', `/creator/offers/${offerId}/voucher`, seed.creator.token);
  expect(refused).toMatchObject({ status: 400, body: { message: "This offer isn't available right now" } });

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('active', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add coupons' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Coupons to add').fill('5');
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('25 left of 25')).toBeVisible();
  expect(await getOffer(offerId)).toMatchObject({ status: 'active', totalCoupons: 25, remainingCoupons: 25 });
});

test('a creator claims and the offer page shows it', async ({ page }) => {
  await asSuperadmin(page);
  const claim = await call('POST', `/creator/offers/${offerId}/voucher`, seed.creator.token);
  expect(claim).toMatchObject({ status: 201, body: { data: { balance: seed.creator.balance - 500, voucher: { status: 'active', connectsCost: 500 } } } });
  voucher = claim.body.data.voucher;

  await page.goto(`/offers/${offerId}`);
  const row = page.getByRole('row', { name: new RegExp(voucher.number) });
  await expect(row.getByRole('cell').nth(1)).toHaveText('Asha @asha');
  await expect(row.getByRole('cell').nth(2)).toHaveText('active');
  await expect(page.getByText('24 left of 25')).toBeVisible();

  await page.goto('/offers');
  await expect(page.getByText('Tazmify-funded this month: 500 / 50,000 Connects')).toBeVisible();
});

test('the venue redeems and the report shows it', async ({ page }) => {
  await asSuperadmin(page);
  const { code } = (await call('GET', `/creator/vouchers/${voucher._id}/code`, seed.creator.token)).body.data;
  const check = await call('POST', '/brand/redemptions/check', seed.brand.token, { code });
  expect(check).toMatchObject({ status: 200, body: { data: { preview: { voucherNumber: voucher.number, discountInr: 1000 } } } });
  const confirm = await call('POST', '/brand/redemptions/confirm', seed.brand.token, { checkToken: check.body.data.checkToken });
  expect(confirm).toMatchObject({ status: 200, body: { data: { redemption: { voucherNumber: voucher.number, creatorName: 'Asha' } } } });

  const month = istMonth();
  await page.goto('/reports');
  await expect(page.getByLabel('Month')).toHaveValue(month);
  await expect(page.getByRole('row', { name: /Café X/ }).getByRole('cell')).toHaveText(['Café X', 'Bengaluru', 'Tazmify', '1', '500', '₹1,000']);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`redemptions-${month}.csv`);
  const csv = readFileSync(await file.path(), 'utf8');
  expect(csv.startsWith('﻿')).toBe(true);
  expect(csv.slice(1).split('\r\n')).toEqual(['Venue,City,Funded by,Vouchers redeemed,Connects,Value (INR)', 'Café X,Bengaluru,Tazmify,1,500,1000']);
});

test('cancel & refund from the offer page refunds the creator', async ({ page }) => {
  await asSuperadmin(page);
  const before = await balance();

  await page.goto(`/offers/${offerId}`);
  const row = page.getByRole('row', { name: new RegExp(voucher.number) });
  await expect(row.getByRole('cell').nth(2)).toHaveText('redeemed');
  await row.getByRole('button', { name: 'Cancel & refund' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('E2E: the bill was settled in full');
  await dialog.getByRole('button', { name: 'Confirm refund' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Voucher cancelled and refunded' })).toBeVisible();
  await expect(row.getByRole('cell').nth(2)).toHaveText('cancelled');

  expect(await balance()).toBe(before + 500);
  // One voucher per creator per offer, ever: a cancelled one still counts.
  const again = await call('POST', `/creator/offers/${offerId}/voucher`, seed.creator.token);
  expect(again).toMatchObject({ status: 400, body: { message: 'You already have this voucher' } });
});

test('cancel & refund from voucher lookup', async ({ page }) => {
  await asSuperadmin(page);
  offer2Id = await createOffer(page, { title: SECOND.title, discount: 400, cost: 300, coupons: 10, funder: 'Brand' });
  const claim = await call('POST', `/creator/offers/${offer2Id}/voucher`, seed.creator.token);
  expect(claim.status).toBe(201);
  const { number } = claim.body.data.voucher;
  const before = claim.body.data.balance as number;

  await page.goto('/vouchers');
  // The server trims and uppercases the number.
  await page.getByLabel('Voucher number').fill(number.toLowerCase());
  await page.getByRole('button', { name: 'Look up' }).click();
  const details = page.getByRole('region', { name: 'Voucher details' });
  await expect(details.getByRole('definition')).toHaveText([number, SECOND.title, 'Café X', '300', '₹400', 'brand', 'Asha @asha', new RegExp(`^${IST.source}$`), new RegExp(`^${IST.source}$`)]);
  await expect(details.getByText('active', { exact: true })).toBeVisible();

  await details.getByRole('button', { name: 'Cancel & refund' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('E2E: the creator asked for a refund');
  await dialog.getByRole('button', { name: 'Confirm refund' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Voucher cancelled and refunded' })).toBeVisible();
  await expect(details.getByText('cancelled', { exact: true })).toBeVisible();
  await expect(details.getByRole('definition').last()).toHaveText('E2E: the creator asked for a refund');

  expect(await balance()).toBe(before + 300);
});

test('ends an offer', async ({ page }) => {
  await asSuperadmin(page);
  await page.goto(`/offers/${offer2Id}`);
  await page.getByRole('button', { name: 'End offer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End offer' }).click();
  await expect(page.getByText('ended', { exact: true })).toBeVisible();
  for (const name of ['Pause', 'Add coupons', 'End offer']) await expect(page.getByRole('button', { name })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
  expect(await getOffer(offer2Id)).toMatchObject({ status: 'ended' });

  await page.goto('/offers');
  await page.getByRole('button', { name: 'Ended' }).click();
  await expect(page.getByRole('row', { name: new RegExp(SECOND.title) })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(FIRST.newTitle) })).toHaveCount(0);
});

test('ops vs superadmin', async ({ page, browser }, testInfo) => {
  await asSuperadmin(page);
  await page.goto('/admins');
  await page.getByLabel('Name', { exact: true }).fill(OPS2.name);
  await page.getByLabel('Email', { exact: true }).fill(OPS2.email);
  await page.getByLabel('Role').selectOption('ops');
  await page.getByLabel('Temporary password').fill(OPS2.password);
  await page.getByRole('button', { name: 'Add admin' }).click();
  await expect(page.getByRole('status')).toHaveText('Admin added');
  const opsRow = page.getByRole('row', { name: new RegExp(OPS2.name) });
  await expect(opsRow.getByRole('cell').nth(2)).toHaveText('ops');
  await expect(opsRow.getByRole('cell').nth(3)).toHaveText('Active');

  // The new ops admin, in a tab of its own.
  const ops = await (await browser.newContext({ baseURL: testInfo.project.use.baseURL })).newPage();
  watch(ops);
  await signIn(ops, OPS2.email, OPS2.password);
  await expect(ops).toHaveURL(/\/offers$/);
  await expect(ops.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(['Offers', 'Vouchers', 'Reports']);
  await ops.goto('/admins');
  await expect(ops.getByText('Not allowed for your role')).toBeVisible();
  await expect(ops.getByRole('table')).toHaveCount(0);

  const selfRow = page.getByRole('row', { name: /E2E Superadmin/ });
  await selfRow.getByRole('button', { name: 'Disable' }).click();
  await expect(page.getByRole('alert').filter({ hasText: "You can't change your own role or disable yourself" })).toBeVisible();
  await expect(selfRow.getByRole('cell').nth(3)).toHaveText('Active');

  await opsRow.getByRole('button', { name: 'Reset password' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('New password').fill(OPS2.newPassword);
  await dialog.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('status')).toHaveText('Password reset');
  // The reset signed the old session out: its next call is a 401, which lands on the sign-in page.
  await ops.goto('/offers');
  await expect(ops).toHaveURL(/\/login$/);
  await signIn(ops, OPS2.email, OPS2.newPassword);
  await expect(ops).toHaveURL(/\/offers$/);
  await ops.getByRole('button', { name: 'Sign out' }).click();
  await expect(ops).toHaveURL(/\/login$/);

  await opsRow.getByRole('button', { name: 'Disable' }).click();
  await expect(opsRow.getByRole('cell').nth(3)).toHaveText('Disabled');
  await signIn(ops, OPS2.email, OPS2.newPassword);
  await expect(ops.getByLabel('Password')).toHaveAccessibleDescription('Invalid moderator credentials');

  await opsRow.getByRole('button', { name: 'Enable' }).click();
  await expect(opsRow.getByRole('cell').nth(3)).toHaveText('Active');
  await ops.context().close();
});
