import type { Page } from '@playwright/test';
import type { ModerationReport } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const list = (results: unknown[]) => ok({ results, total: results.length, page: 1, totalPages: 1 });
const report = (over: Partial<ModerationReport> = {}): ModerationReport => ({
  _id: 'r1', reason: 'harassment', details: 'Keeps messaging me', snapshot: '<b>bad</b> words', status: 'pending', resolution: 'none',
  targetType: 'message', targetId: 'm1', createdAt: '2026-10-01T00:00:00Z',
  reporter: { _id: 'c1', role: 'creator', name: 'Asha Rao' }, subject: { _id: 'b1', role: 'brand', name: 'Cafe Blue' }, ...over,
});
const ACTIONS = /^(Reviewing|Dismiss|Warn|Hide|Restore|Suspend|Unsuspend)$/;
const buttons = (page: Page) => page.getByRole('article').getByRole('button').filter({ hasText: ACTIONS }).allTextContents();

test('queue shows reporter and subject names, reason, details and snapshot', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /moderation/reports': () => list([report()]) });
  await signIn(page);
  await page.goto('/moderation');
  const card = page.getByRole('article');
  await expect(card).toContainText('harassment');
  await expect(card).toContainText('Keeps messaging me');
  await expect(card.getByText('<b>bad</b> words')).toBeVisible(); // text, not HTML
  await expect(page.getByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/creators/c1');
  await expect(page.getByRole('link', { name: 'Cafe Blue' })).toHaveAttribute('href', '/brands/b1');
  expect(calls[0].url()).toContain('status=pending');
  await page.getByRole('button', { name: 'Resolved' }).click();
  await expect.poll(() => calls.at(-1)?.url()).toContain('status=resolved');
});

test('intern sees only Reviewing, Dismiss and Warn', async ({ page }) => {
  await mockApi(page, { 'GET /moderation/reports': () => list([report()]) });
  await signIn(page, { role: 'intern' });
  await page.goto('/moderation');
  await expect(page.getByRole('article')).toBeVisible();
  expect(await buttons(page)).toEqual(['Reviewing', 'Dismiss', 'Warn']);
});

test('admin sees Hide, Restore, Suspend and Unsuspend where the report allows them', async ({ page }) => {
  await mockApi(page, {
    'GET /moderation/reports': () => list([
      report({ _id: 'r1' }),
      report({ _id: 'r2', status: 'resolved', resolution: 'hidden' }),
      report({ _id: 'r3', targetType: 'profile' }),
      report({ _id: 'r4', targetType: 'profile', status: 'resolved', resolution: 'account_suspended' }),
    ]),
  });
  await signIn(page);
  await page.goto('/moderation');
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(4);
  const of = (i: number) => cards.nth(i).getByRole('button').filter({ hasText: ACTIONS }).allTextContents();
  expect(await of(0)).toEqual(['Reviewing', 'Dismiss', 'Warn', 'Hide']);
  expect(await of(1)).toEqual(['Restore']);
  expect(await of(2)).toEqual(['Reviewing', 'Dismiss', 'Warn', 'Suspend']);
  expect(await of(3)).toEqual(['Unsuspend']);
});

test('a decision PATCHes the action and note once; a server refusal message shows inline', async ({ page }) => {
  let n = 0;
  const calls = await mockApi(page, {
    'GET /moderation/reports': () => list([report()]),
    'PATCH /moderation/reports/r1': async () => { n += 1; await new Promise((r) => setTimeout(r, 300)); return fail(400, 'This report already hides the content'); },
  });
  await signIn(page);
  await page.goto('/moderation');
  await page.getByLabel('Note').fill('checked');
  await page.getByRole('button', { name: 'Hide' }).dblclick();
  await expect(page.getByText('This report already hides the content')).toBeVisible();
  expect(n).toBe(1);
  expect(calls.find((r) => r.method() === 'PATCH')?.postDataJSON()).toEqual({ action: 'hide', note: 'checked' });
});

test('a decision updates the report in place', async ({ page }) => {
  await mockApi(page, {
    'GET /moderation/reports': () => list([report()]),
    'PATCH /moderation/reports/r1': (req) => { expect(req.postDataJSON()).toEqual({ action: 'reviewing' }); return ok({ report: { _id: 'r1', status: 'reviewing', resolution: 'none' } }); },
  });
  await signIn(page);
  await page.goto('/moderation');
  await page.getByRole('button', { name: 'Reviewing', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Reviewing');
  await expect(page.getByRole('article')).toContainText('Asha Rao');
});

test('a report whose subject was deleted shows "Deleted account"', async ({ page }) => {
  await mockApi(page, { 'GET /moderation/reports': () => list([report({ subject: null, reporter: null })]) });
  await signIn(page);
  await page.goto('/moderation');
  await expect(page.getByRole('article')).toContainText('Deleted account reported Deleted account');
  await expect(page.getByRole('article').getByRole('link')).toHaveCount(0);
});
