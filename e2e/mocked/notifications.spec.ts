import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const row = { _id: 'b1', admin: { _id: 'a1', name: 'Asha' }, audience: 'creators', title: 'Hi', body: 'There', status: 'sent', recipients: 42, delivered: 40, createdAt: '2026-11-01T00:00:00Z' };
const hist = { 'GET /admin/broadcasts': () => ok({ results: [row], total: 1, page: 1, totalPages: 1 }) };

test('choosing an audience fetches the count and the confirm dialog says "Send to N accounts?"', async ({ page }) => {
  const calls = await mockApi(page, { ...hist, 'GET /admin/broadcasts/audience': () => ok({ count: 7 }) });
  await signIn(page);
  await page.goto('/notifications');
  await page.getByLabel('Audience').selectOption('brands');
  await expect(page.getByText('7 accounts', { exact: true })).toBeVisible();
  expect(calls.some((r) => r.url().includes('/admin/broadcasts/audience?audience=brands'))).toBe(true);
  await page.getByLabel('Title').fill('T');
  await page.getByLabel('Message').fill('B');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Send to 7 accounts?');
});

test('one clientKey per form: two clicks on Send post once, and a retry after an error reuses the same clientKey', async ({ page }) => {
  let n = 0;
  let historyGets = 0;
  const posts: { clientKey: string; audience: string; title: string; body: string }[] = [];
  await mockApi(page, {
    'GET /admin/broadcasts': () => { historyGets++; return ok({ results: [row], total: 1, page: 1, totalPages: 1 }); },
    'GET /admin/broadcasts/audience': () => ok({ count: 3 }),
    'POST /admin/broadcasts': async (r) => {
      posts.push(r.postDataJSON() as never);
      if (++n === 1) return fail(500, 'Could not queue');
      await new Promise((res) => setTimeout(res, 300));
      return ok({ broadcast: row });
    },
  });
  await signIn(page);
  await page.goto('/notifications');
  await page.getByLabel('Title').fill('Hello');
  await page.getByLabel('Message').fill('World');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Send' }).dblclick();
  await expect(dialog).toContainText('Could not queue');
  expect(posts.length).toBe(1);
  await dialog.getByRole('button', { name: 'Send' }).dblclick();
  await expect(dialog).toHaveCount(0);
  expect(posts.length).toBe(2);
  expect(posts[1].clientKey).toBe(posts[0].clientKey);
  expect(posts[0]).toMatchObject({ audience: 'everyone', title: 'Hello', body: 'World' });
  expect(posts[0].clientKey).toMatch(/^[0-9a-f-]{36}$/);
  expect(historyGets).toBeGreaterThanOrEqual(2);
  // after a success the form is fresh with a new key
  await page.getByLabel('Title').fill('Again');
  await page.getByLabel('Message').fill('Again');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog).toHaveCount(0);
  expect(posts.length).toBe(3);
  expect(posts[2].clientKey).not.toBe(posts[0].clientKey);
});

test('history lists sender, audience, recipients and status', async ({ page }) => {
  await mockApi(page, { ...hist, 'GET /admin/broadcasts/audience': () => ok({ count: 3 }) });
  await signIn(page);
  await page.goto('/notifications');
  const r = page.getByRole('row', { name: /Hi/ });
  await expect(r).toContainText('Asha');
  await expect(r).toContainText('Creators');
  await expect(r).toContainText('42');
  await expect(r).toContainText('Sent');
});

test('editing the title or changing the audience after an error posts a new clientKey', async ({ page }) => {
  const posts: { clientKey: string; audience: string; title: string }[] = [];
  await mockApi(page, {
    ...hist,
    'GET /admin/broadcasts/audience': () => ok({ count: 3 }),
    'POST /admin/broadcasts': (r) => { posts.push(r.postDataJSON() as never); return fail(500, 'Could not queue'); },
  });
  await signIn(page);
  await page.goto('/notifications');
  await page.getByLabel('Title').fill('One');
  await page.getByLabel('Message').fill('Body');
  const dialog = page.getByRole('dialog');
  const attempt = async () => {
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog).toContainText('Could not queue');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  };
  await attempt();
  await page.getByLabel('Title').fill('Two');
  await attempt();
  await page.getByLabel('Audience').selectOption('brands');
  await expect(page.getByText('3 accounts', { exact: true })).toBeVisible();
  await attempt();
  expect(posts.map((p) => [p.audience, p.title])).toEqual([['everyone', 'One'], ['everyone', 'Two'], ['brands', 'Two']]);
  expect(new Set(posts.map((p) => p.clientKey)).size).toBe(3);
});
