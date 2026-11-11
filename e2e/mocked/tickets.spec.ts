import type { TicketDetail, TicketRow } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const list = (results: unknown[]) => ok({ results, total: results.length, page: 1, totalPages: 1 });
const row = (over: Partial<TicketRow> = {}): TicketRow => ({ _id: 't1', subject: 'Cannot log in', status: 'open', userRole: 'creator', user: { _id: 'c1', name: 'Asha Rao' }, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over });
const detail = (over: Partial<TicketDetail> = {}, status: TicketDetail['ticket']['status'] = 'open'): TicketDetail => ({
  ticket: { _id: 't1', subject: 'Cannot log in', description: 'It says <i>invalid</i>', status, userRole: 'creator', createdAt: '2026-10-01T00:00:00Z', notes: [] },
  user: { _id: 'c1', role: 'creator', name: 'Asha Rao', email: 'asha@x.com', phoneNumber: '+911234567890' }, history: [], ...over,
});

test('oldest first, status chips', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/tickets': () => list([row({ _id: 't1', subject: 'First one' }), row({ _id: 't2', subject: 'Second one', status: 'resolved' })]) });
  await signIn(page, { role: 'intern' });
  await page.goto('/tickets');
  const rows = page.getByRole('row');
  await expect(rows.nth(1)).toContainText('First one');
  await expect(rows.nth(2)).toContainText('Second one');
  await expect(page.getByRole('link', { name: 'First one' })).toHaveAttribute('href', '/tickets/t1');
  await page.getByRole('button', { name: 'In progress' }).click();
  await expect.poll(() => calls.at(-1)?.url()).toContain('status=in_progress&page=1');
});

test('changing status to resolved PATCHes { status: "resolved" }', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /admin/tickets/t1': () => ok(detail()),
    'PATCH /admin/tickets/t1': () => ok({ ticket: detail({}, 'resolved').ticket }),
  });
  await signIn(page, { role: 'intern' });
  await page.goto('/tickets/t1');
  await expect(page.getByText('It says <i>invalid</i>')).toBeVisible();
  await page.getByRole('button', { name: 'Resolved' }).click();
  await expect(page.getByRole('button', { name: 'Resolved' })).toHaveAttribute('aria-pressed', 'true');
  const patches = calls.filter((r) => r.method() === 'PATCH');
  expect(patches).toHaveLength(1);
  expect(patches[0].postDataJSON()).toEqual({ status: 'resolved' });
});

test('adding a note appends it with my name', async ({ page }) => {
  let posts = 0;
  const calls = await mockApi(page, {
    'GET /admin/tickets/t1': () => ok(detail()),
    'POST /admin/tickets/t1/notes': async (req) => {
      posts += 1;
      await new Promise((r) => setTimeout(r, 300));
      return ok({ ticket: { ...detail().ticket, notes: [{ text: req.postDataJSON().text, at: '2026-10-02T00:00:00Z', admin: { _id: 'a1', name: 'Asha' } }] } });
    },
  });
  await signIn(page);
  await page.goto('/tickets/t1');
  await page.getByLabel('Note').fill('Called the creator');
  await page.getByRole('button', { name: 'Add note' }).dblclick();
  await expect(page.getByText('Called the creator')).toBeVisible();
  await expect(page.getByText(/Asha ·/)).toBeVisible();
  await expect(page.getByLabel('Note')).toHaveValue('');
  expect(posts).toBe(1);
  expect(calls.find((r) => r.method() === 'POST')?.postDataJSON()).toEqual({ text: 'Called the creator' });
});

test('a server refusal on a note shows inline', async ({ page }) => {
  await mockApi(page, { 'GET /admin/tickets/t1': () => ok(detail()), 'POST /admin/tickets/t1/notes': () => fail(400, 'Note is too long') });
  await signIn(page);
  await page.goto('/tickets/t1');
  await page.getByLabel('Note').fill('x');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Note is too long')).toBeVisible();
});

test('the user links to their creator or brand page', async ({ page }) => {
  await mockApi(page, { 'GET /admin/tickets/t1': () => ok(detail({ user: { _id: 'b9', role: 'brand', name: 'Cafe Blue' } })) });
  await signIn(page);
  await page.goto('/tickets/t1');
  await expect(page.getByRole('link', { name: 'Cafe Blue' })).toHaveAttribute('href', '/brands/b9');
});

test('a ticket from a deleted user shows "Deleted account"', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/tickets': () => list([row({ user: null })]),
    'GET /admin/tickets/t1': () => ok(detail({ user: null })),
  });
  await signIn(page);
  await page.goto('/tickets');
  await expect(page.getByRole('row', { name: /Cannot log in/ })).toContainText('Deleted account');
  await page.goto('/tickets/t1');
  await expect(page.getByText('Deleted account')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Deleted account' })).toHaveCount(0);
});
