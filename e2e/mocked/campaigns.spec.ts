import type { CampaignDetail, CampaignRow, JobRow } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const list = (results: unknown[]) => ok({ results, total: results.length, page: 1, totalPages: 1 });
const row = (over: Partial<CampaignRow> = {}): CampaignRow => ({ _id: 'k1', title: 'Summer Reels', status: 'active', brand: { _id: 'b1', name: 'Cafe Blue' }, applications: 4, createdAt: '2026-10-01T00:00:00Z', adminClosed: null, ...over });
const job = (over: Partial<JobRow> = {}): JobRow => ({ _id: 'j1', status: 'in_progress', campaign: { _id: 'k1', title: 'Summer Reels' }, creator: { _id: 'c1', name: 'Asha Rao' }, brand: { _id: 'b1', name: 'Cafe Blue' }, createdAt: '2026-10-02T00:00:00Z', ...over });
const detail = (status: CampaignDetail['campaign']['status'] = 'active', adminClosed: CampaignDetail['campaign']['adminClosed'] = null): CampaignDetail => ({
  campaign: { _id: 'k1', title: 'Summer Reels', status, createdAt: '2026-10-01T00:00:00Z', adminClosed },
  brand: { _id: 'b1', name: 'Cafe Blue' }, applicationCounts: { pending: 2, accepted: 1, rejected: 0, hired: 1 },
  jobs: [job()], reports: [], history: [],
});

test('list filters by status', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/campaigns': () => list([row()]) });
  await signIn(page);
  await page.goto('/campaigns');
  await expect(page.getByRole('row', { name: /Summer Reels/ })).toContainText('Cafe Blue');
  await expect(page.getByRole('link', { name: 'Summer Reels' })).toHaveAttribute('href', '/campaigns/k1');
  await page.getByRole('button', { name: 'Closed' }).click();
  await expect.poll(() => calls.at(-1)?.url()).toContain('status=closed&page=1');
});

test('admin closes with a reason; the page then shows "Closed by Tazmify: <reason>" and a Reopen button', async ({ page }) => {
  let closed: { reason: string; at: string } | null = null;
  const calls = await mockApi(page, {
    'GET /admin/campaigns/k1': () => ok(closed ? detail('closed', closed) : detail()),
    'POST /admin/campaigns/k1/close': (req) => { closed = { reason: req.postDataJSON().reason, at: '2026-10-05T00:00:00Z' }; return ok({ msg: 'Campaign closed' }); },
  });
  await signIn(page);
  await page.goto('/campaigns/k1');
  await page.getByRole('button', { name: 'Close campaign' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Close campaign' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  expect(calls.filter((r) => r.method() === 'POST')).toHaveLength(0);
  await dialog.getByLabel('Shown to the brand').fill('Policy breach');
  await dialog.getByRole('button', { name: 'Close campaign' }).click();
  await expect(page.getByText('Closed by Tazmify: Policy breach')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();
  expect(calls.find((r) => r.method() === 'POST')?.postDataJSON()).toEqual({ reason: 'Policy breach' });
});

test('admin reopens a closed campaign', async ({ page }) => {
  let reopened = false;
  const calls = await mockApi(page, {
    'GET /admin/campaigns/k1': () => ok(reopened ? detail() : detail('closed', { reason: 'Spam', at: '2026-10-05T00:00:00Z' })),
    'POST /admin/campaigns/k1/reopen': () => { reopened = true; return ok({ msg: 'ok' }); },
  });
  await signIn(page);
  await page.goto('/campaigns/k1');
  await page.getByRole('button', { name: 'Reopen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByRole('button', { name: 'Close campaign' })).toBeVisible();
  expect(calls.find((r) => r.method() === 'POST')?.url()).toContain('/admin/campaigns/k1/reopen');
});

test('a server refusal on close shows in the dialog', async ({ page }) => {
  await mockApi(page, { 'GET /admin/campaigns/k1': () => ok(detail()), 'POST /admin/campaigns/k1/close': () => fail(400, 'Only active campaigns can be closed') });
  await signIn(page);
  await page.goto('/campaigns/k1');
  await page.getByRole('button', { name: 'Close campaign' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Shown to the brand').fill('Because');
  await dialog.getByRole('button', { name: 'Close campaign' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Only active campaigns can be closed');
});

test('intern sees no Close', async ({ page }) => {
  await mockApi(page, { 'GET /admin/campaigns/k1': () => ok(detail()) });
  await signIn(page, { role: 'intern' });
  await page.goto('/campaigns/k1');
  await expect(page.getByRole('heading', { name: 'Summer Reels' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Close|Reopen/ })).toHaveCount(0);
});

test('jobs list links each row to the campaign, creator and brand pages', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/jobs': () => list([job()]) });
  await signIn(page);
  await page.goto('/jobs');
  const r = page.getByRole('row', { name: /Asha Rao/ });
  await expect(r.getByRole('link', { name: 'Summer Reels' })).toHaveAttribute('href', '/campaigns/k1');
  await expect(r.getByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/creators/c1');
  await expect(r.getByRole('link', { name: 'Cafe Blue' })).toHaveAttribute('href', '/brands/b1');
  await expect(page.getByLabel('Search')).toHaveCount(0);
  await page.getByRole('button', { name: 'Completed' }).click();
  await expect.poll(() => calls.at(-1)?.url()).toContain('status=completed&page=1');
  expect(calls.every((c) => !new URL(c.url()).searchParams.has('q'))).toBe(true);
});

test('a job with a deleted creator shows "Deleted account"', async ({ page }) => {
  await mockApi(page, { 'GET /admin/jobs': () => list([job({ creator: null, campaign: null })]) });
  await signIn(page);
  await page.goto('/jobs');
  const r = page.getByRole('row', { name: /Cafe Blue/ });
  await expect(r.getByText('Deleted account')).toBeVisible();
  await expect(r.getByText('Deleted campaign')).toBeVisible();
  await expect(r.getByRole('link', { name: 'Deleted account' })).toHaveCount(0);
});
