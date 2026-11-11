import type { CreatorDetail, CreatorRow, LedgerRow } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const row = (over: Partial<CreatorRow> = {}): CreatorRow => ({ _id: 'c1', name: 'Asha Rao', username: 'asha', email: 'asha@x.com', createdAt: '2026-10-01T00:00:00Z', status: 'active', connectsBalance: 40, totalFollowers: 1200, ...over });
const list = (results: unknown[]) => ok({ results, total: results.length, page: 1, totalPages: 1 });
const noSuspension = { admin: null, reportId: null };
const detail = (over: Partial<CreatorDetail> = {}, creator: Partial<CreatorDetail['creator']> = {}): CreatorDetail => ({
  creator: { _id: 'c1', name: 'Asha Rao', username: 'asha', email: 'asha@x.com', createdAt: '2026-10-01T00:00:00Z', connectsBalance: 40, ...creator },
  socials: [{ platform: 'instagram', username: 'asha_rao', followers: 12000, engagementRate: 3.5, tokenExpired: false }],
  counts: { applications: 3, jobs: 1 }, reports: [],
  history: [{ _id: 'h1', action: 'connects.adjust', details: '+10: welcome', createdAt: '2026-10-02T00:00:00Z', admin: { _id: 'a1', name: 'Meera' } }],
  suspension: noSuspension, ...over,
});
const ledger: LedgerRow = { _id: 'l1', type: 'admin_adjust', amount: 10, balanceAfter: 40, reason: 'welcome', createdAt: '2026-10-02T00:00:00Z' };
const ledgerPage = () => ok({ results: [ledger], total: 1, page: 1, totalPages: 1 });
const creatorRoutes = (d: CreatorDetail = detail()) => ({
  'GET /admin/accounts/creators/c1': () => ok(d),
  'GET /admin/accounts/creators/c1/ledger': ledgerPage,
});
const brand = (over: Record<string, unknown> = {}, suspension: unknown = noSuspension) => ok({
  brand: { _id: 'b1', name: 'Cafe Blue', createdAt: '2026-10-01T00:00:00Z', ...over },
  campaigns: [], reviews: { count: 0, average: 0, latest: [] }, reports: [], history: [], suspension,
});

test('search sends q and shows rows', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/accounts/creators': () => list([row()]) });
  await signIn(page);
  await page.goto('/creators');
  await expect(page.getByRole('row', { name: /Asha Rao/ })).toContainText('asha@x.com');
  await page.getByRole('button', { name: 'Active' }).click();
  await page.getByLabel('Search').fill('asha');
  await expect.poll(() => calls.at(-1)?.url()).toContain('q=asha&status=active&page=1');
  await expect(page.getByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/creators/c1');
});

test('creator page shows socials, balance, ledger and history', async ({ page }) => {
  await mockApi(page, creatorRoutes());
  await signIn(page);
  await page.goto('/creators/c1');
  await expect(page.getByRole('heading', { name: 'Asha Rao' })).toBeVisible();
  await expect(page.getByText('instagram')).toBeVisible();
  await expect(page.getByText('@asha_rao')).toBeVisible();
  await expect(page.getByTestId('balance')).toHaveText('40');
  await expect(page.getByRole('row', { name: /welcome/ })).toContainText('40');
  await expect(page.getByText('connects.adjust')).toBeVisible();
  await expect(page.getByText('Meera')).toBeVisible();
});

test('admin adjusts Connects: the reason field is labeled "Shown to the creator", it posts { amount: -5, reason, note }, and the new balance shows', async ({ page }) => {
  let balance = 40;
  const calls = await mockApi(page, {
    'GET /admin/accounts/creators/c1': () => ok(detail({}, { connectsBalance: balance })),
    'GET /admin/accounts/creators/c1/ledger': ledgerPage,
    'POST /admin/accounts/creators/c1/connects': () => { balance = 35; return ok({ balance }); },
  });
  await signIn(page);
  await page.goto('/creators/c1');
  await page.getByRole('button', { name: 'Adjust Connects' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount').fill('-5');
  await dialog.getByLabel('Shown to the creator').fill('Refund correction');
  await dialog.getByLabel('Internal note').fill('ticket 42');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('balance')).toHaveText('35');
  expect(calls.find((r) => r.method() === 'POST')?.postDataJSON()).toEqual({ amount: -5, reason: 'Refund correction', note: 'ticket 42' });
});

test('suspend needs a reason, and an account held by a report shows "Suspended by a user report — lift it from Moderation"', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /admin/accounts/brands/b1': () => brand(),
    'GET /admin/accounts/brands/b2': () => brand({ _id: 'b2', name: 'Cafe Red', moderationSuspended: true }, { admin: null, reportId: 'r1' }),
  });
  await signIn(page);
  await page.goto('/brands/b1');
  await page.getByRole('button', { name: 'Suspend' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Suspend' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  expect(calls.filter((r) => r.method() === 'POST')).toHaveLength(0);
  await page.goto('/brands/b2');
  await expect(page.getByText('Suspended by a user report — lift it from Moderation')).toBeVisible();
});

test('intern sees no Suspend or Adjust buttons', async ({ page }) => {
  await mockApi(page, creatorRoutes());
  await signIn(page, { role: 'intern' });
  await page.goto('/creators/c1');
  await expect(page.getByRole('heading', { name: 'Asha Rao' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Suspend|Unsuspend|Adjust/ })).toHaveCount(0);
});

test('a deleted account shows "Deleted account" and no action buttons, even for Admin', async ({ page }) => {
  await mockApi(page, creatorRoutes(detail({}, { deletedAccount: true })));
  await signIn(page);
  await page.goto('/creators/c1');
  await expect(page.getByText('Deleted account')).toBeVisible();
  await expect(page.getByRole('button', { name: /Suspend|Unsuspend|Adjust/ })).toHaveCount(0);
});

test("a 400 from adjust shows the server's message in the dialog", async ({ page }) => {
  await mockApi(page, { ...creatorRoutes(), 'POST /admin/accounts/creators/c1/connects': () => fail(400, 'This account was deleted') });
  await signIn(page);
  await page.goto('/creators/c1');
  await page.getByRole('button', { name: 'Adjust Connects' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount').fill('5');
  await dialog.getByLabel('Shown to the creator').fill('Bonus');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('This account was deleted');
});
