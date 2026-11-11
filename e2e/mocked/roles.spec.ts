import { expect, fail, mockApi, ok, signIn, test } from './helpers';

test('intern sees only their sections', async ({ page }) => {
  await mockApi(page, {});
  await signIn(page, { role: 'intern', name: 'Ira' });
  await page.goto('/offers'); // any existing page renders the shell; the guard keeps it from fetching
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Creators', 'Brands', 'Campaigns', 'Jobs', 'Moderation', 'Support']) await expect(nav.getByRole('link', { name })).toBeVisible();
  for (const name of ['Offers', 'Settings', 'Team']) await expect(nav.getByRole('link', { name })).toHaveCount(0);
});

test('intern opening an Admin-only URL (/reports, /offers) sees the not-available card and no /api call is made', async ({ page }) => {
  const calls = await mockApi(page, {});
  await signIn(page, { role: 'intern' });
  await page.goto('/reports');
  await expect(page.getByText("This page isn't available for your level.")).toBeVisible();
  await page.goto('/offers');
  await expect(page.getByText("This page isn't available for your level.")).toBeVisible();
  expect(calls).toHaveLength(0);
});

test('ops lands on /offers after sign-in', async ({ page }) => {
  await mockApi(page, {
    'POST /moderation/login': () => ({ json: { accessToken: 't', role: 'ops', name: 'Ravi' } }),
    'GET /admin/budget': () => ok({ month: '2026-10', usedConnects: 0, capConnects: 50000 }),
    'GET /admin/offers': () => ok({ results: [], total: 0, page: 1, totalPages: 0 }),
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill('ravi@tazmify.com');
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/offers');
});

test('a 429 on sign-in shows "Too many attempts, try again in 15 minutes"', async ({ page }) => {
  await mockApi(page, { 'POST /moderation/login': () => fail(429, 'Too many attempts, try again in 15 minutes') });
  await page.goto('/login');
  await page.getByLabel('Email').fill('a@tazmify.com');
  await page.getByLabel('Password').fill('whatever');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Too many attempts, try again in 15 minutes')).toBeVisible();
});
