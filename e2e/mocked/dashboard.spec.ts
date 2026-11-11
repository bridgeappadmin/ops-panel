import type { Stats } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const days = Array.from({ length: 30 }, (_, i) => ({
  day: `2026-10-${String(i + 1).padStart(2, '0')}`,
  creators: i % 4 === 0 ? 0 : i,
  brands: i % 3 === 0 ? 0 : 2,
}));
const stats: Stats = {
  creators: { total: 12345, new30d: 321 },
  brands: { total: 678, new30d: 45 },
  signupsByDay: days,
  campaigns: { draft: 11, active: 22, closed: 33, completed: 44 },
  applications30d: 5555,
  jobs: { hired: 1, in_progress: 2, completion_pending: 3, completed: 4, cancelled: 5 },
  connects30d: { earned: 70000, spent: 8800 },
  vouchersRedeemed30d: 99,
  openTickets: 7,
  pendingReports: 3,
};
const budget = () => ok({ month: '2026-10', usedConnects: 32500, capConnects: 50000 });

test('shows every number from /admin/stats', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/stats': () => ok(stats) });
  await signIn(page);
  await page.goto('/dashboard');
  const main = page.getByRole('main');
  for (const t of ['12,345', '321', '678', '45', '11', '22', '33', '44', '5,555', '70,000', '8,800', '99', '7', '3']) {
    await expect(main.getByText(t, { exact: true }).first()).toBeVisible();
  }
  for (const [label, n] of [['Hired', '1'], ['In progress', '2'], ['Completion pending', '3'], ['Completed', '4'], ['Cancelled', '5']]) {
    await expect(main.locator('dl').nth(1).getByText(label, { exact: true }).locator('xpath=..')).toContainText(n);
  }
});

test('open tickets links to /tickets and pending reports links to /moderation', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/stats': () => ok(stats) });
  await signIn(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('main').getByRole('link', { name: /Open tickets/ })).toHaveAttribute('href', '/tickets');
  await expect(page.getByRole('main').getByRole('link', { name: /Pending reports/ })).toHaveAttribute('href', '/moderation');
});

test('the chart has 30 day groups', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/stats': () => ok(stats) });
  await signIn(page);
  await page.goto('/dashboard');
  await expect(page.locator('svg[role="img"] g[data-day]')).toHaveCount(30);
  await expect(page.locator('svg[role="img"] title').first()).toBeAttached();
  await expect(page.getByText(/Creator sign-ups/).first()).toBeVisible();
});

test('shows an error when stats fail', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/stats': () => fail(500, 'Boom') });
  await signIn(page);
  await page.goto('/dashboard');
  await expect(page.getByText('Boom')).toBeVisible();
});

test('shows the venue budget, linked to /offers', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/stats': () => ok(stats) });
  await signIn(page);
  await page.goto('/dashboard');
  const card = page.getByRole('main').getByRole('link', { name: /Venue budget this month/ });
  await expect(card).toHaveAttribute('href', '/offers');
  await expect(card).toContainText('65%');
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '65');
});
