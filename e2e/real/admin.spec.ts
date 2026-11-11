import { request, type APIRequestContext, type Page } from '@playwright/test';
import { seed as loadSeed, SERVER_URL, type E2eSeed } from './global-setup';
import { expect, signIn, test, watch } from './helpers';

// The admin panel's three levels against the real server, after ops.spec.ts (the e2e project depends on it). The
// first test signs each level in through the form and keeps the sessions; the rest reuse them. The suspension runs
// last: it signs the seeded creator out for good, and the Connects and push tests read with its token.
test.describe.configure({ mode: 'serial' });

type AdminSession = { token: string; role: string; name: string };
const CLOSE_REASON = 'E2E: the brief asks for fake reviews';
const NOTE = 'E2E: resent the voucher code by SMS';
const PUSH = { title: 'E2E: monsoon offers are live', body: 'Ten new venue offers this week. Open the app to claim one.' };
const NICHE = 'Street food';
// '26 Oct, 5:30 PM'
const IST = /^\d{1,2} [A-Z][a-z]{2}, \d{1,2}:\d{2} [AP]M$/;

let seed: E2eSeed;
let server: APIRequestContext;
const session: Record<'admin' | 'ops' | 'intern', AdminSession> = {} as never;

test.beforeAll(async () => {
  seed = loadSeed();
  server = await request.newContext({ baseURL: SERVER_URL });
});
test.afterAll(() => server.dispose());

/** A direct call to the server (its routes sit at the root, no /v1), as an app or the panel would make it. */
async function call(method: string, path: string, token?: string, data?: unknown) {
  const res = await server.fetch(path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, data });
  return { status: res.status(), body: await res.json() };
}
const balance = async () => (await call('GET', '/creator/connects', seed.creator.token)).body.data.balance as number;

const readSession = (page: Page): Promise<AdminSession> => page.evaluate(() => ({
  token: sessionStorage.getItem('ops.token')!, role: sessionStorage.getItem('ops.role')!, name: sessionStorage.getItem('ops.name')!,
}));

/** Signs the page in with a kept session, as a reload would find it. */
async function as(page: Page, s: AdminSession) {
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('ops.token')) return;
    sessionStorage.setItem('ops.token', s.token);
    sessionStorage.setItem('ops.role', s.role);
    sessionStorage.setItem('ops.name', s.name);
  }, s);
}

test('each level signs in and lands on its home', async ({ page, context }) => {
  // Admin: the dashboard, counting the seeded ticket and report.
  await signIn(page, seed.superadmin.email, seed.superadmin.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open tickets: 1' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pending reports: 1' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText([
    'Dashboard', 'Creators', 'Brands', 'Campaigns', 'Jobs', 'Moderation', 'Support', 'Offers', 'Vouchers', 'Reports', 'Settings', 'Push', 'Team',
  ]);
  session.admin = await readSession(page);
  expect(session.admin).toMatchObject({ role: 'superadmin', name: 'E2E Superadmin' });

  // Operations: the offers, and only the venue sections. (Each tab has its own sessionStorage.)
  const ops = await context.newPage();
  watch(ops);
  await signIn(ops, seed.ops.email, seed.ops.password);
  await expect(ops).toHaveURL(/\/offers$/);
  await expect(ops.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(['Offers', 'Vouchers', 'Reports']);
  session.ops = await readSession(ops);
  expect(session.ops).toMatchObject({ role: 'ops', name: 'E2E Ops' });

  // Intern: support, with the seeded ticket in the queue.
  const intern = await context.newPage();
  watch(intern);
  await signIn(intern, seed.intern.email, seed.intern.password);
  await expect(intern).toHaveURL(/\/tickets$/);
  await expect(intern.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(['Creators', 'Brands', 'Campaigns', 'Jobs', 'Moderation', 'Support']);
  await expect(intern.getByRole('row', { name: /My voucher code will not load/ }).getByRole('cell')).toHaveText(['My voucher code will not load', 'Asha', 'Open', IST]);
  session.intern = await readSession(intern);
  expect(session.intern).toMatchObject({ role: 'intern', name: 'E2E Intern' });
});

test('a sixth wrong sign-in for one email gets "Too many attempts, try again in 15 minutes"', async ({ page }) => {
  // An email of its own, so the seeded accounts' buckets stay empty. Sign-in goes straight to the server, so the 429
  // is read cross-origin: this also proves it carries the CORS headers.
  const email = 'nobody@tazmify-e2e.test';
  for (let i = 1; i <= 5; i++) {
    await signIn(page, email, `wrong-password-${i}`);
    await expect(page.getByLabel('Password')).toHaveAccessibleDescription('Invalid moderator credentials');
  }
  await signIn(page, email, 'wrong-password-6');
  await expect(page.getByLabel('Password')).toHaveAccessibleDescription('Too many attempts, try again in 15 minutes');
  await expect(page).toHaveURL(/\/login$/);
});

test('intern calling an admin API directly gets 403', async ({ page }) => {
  const res = await page.request.post(`/api/admin/accounts/creators/${seed.creator.id}/connects`, {
    headers: { Authorization: `Bearer ${session.intern.token}` }, data: { amount: 5, reason: 'E2E: an intern tries' },
  });
  expect(res.status()).toBe(403);
  expect(await balance()).toBe(seed.creator.balance);
});

test("admin adjusts the creator's Connects", async ({ page }) => {
  const reason = 'E2E: thanks for the bug report';
  await as(page, session.admin);
  await page.goto(`/creators/${seed.creator.id}`);
  await expect(page.getByTestId('balance')).toHaveText('1,240');
  await page.getByRole('button', { name: 'Adjust Connects' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount').fill('5');
  await dialog.getByLabel('Shown to the creator').fill(reason);
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('row', { name: new RegExp(reason) }).getByRole('cell')).toHaveText([IST, 'admin_adjust', '+5', '1245', reason]);
  await expect(page.getByTestId('balance')).toHaveText('1,245');
  expect(await balance()).toBe(1245);
  const { results } = (await call('GET', '/creator/notifications', seed.creator.token)).body.data;
  expect(results[0]).toMatchObject({ title: '5 Connects added', body: reason });
});

test("admin closes the campaign, and the brand's reopen is refused with the reason", async ({ page }) => {
  await as(page, session.admin);
  await page.goto(`/campaigns/${seed.campaignId}`);
  await expect(page.getByRole('heading', { level: 2, name: 'Monsoon menu launch' })).toBeVisible();
  await page.getByRole('button', { name: 'Close campaign' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Shown to the brand').fill(CLOSE_REASON);
  await dialog.getByRole('button', { name: 'Close campaign' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Closed by Tazmify: ${CLOSE_REASON}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();

  const reopen = await call('PATCH', `/brand/campaigns/${seed.campaignId}/reopen`, seed.brand.token);
  expect(reopen).toMatchObject({ status: 400, body: { message: `Tazmify closed this campaign: ${CLOSE_REASON}. Contact support.` } });
  expect((await call('GET', `/admin/campaigns/${seed.campaignId}`, session.admin.token)).body.data.campaign).toMatchObject({ status: 'closed' });
});

test('intern resolves the ticket with a note', async ({ page }) => {
  await as(page, session.intern);
  await page.goto('/tickets');
  await page.getByRole('link', { name: 'My voucher code will not load' }).click();
  await expect(page).toHaveURL(new RegExp(`/tickets/${seed.ticketId}$`));
  await page.getByLabel('Note', { exact: true }).fill(NOTE);
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: NOTE })).toContainText('E2E Intern');
  await expect(page.getByLabel('Note', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Resolved' }).click();
  await expect(page.getByRole('button', { name: 'Resolved' })).toHaveAttribute('aria-pressed', 'true');

  const { ticket } = (await call('GET', `/admin/tickets/${seed.ticketId}`, session.intern.token)).body.data;
  expect(ticket).toMatchObject({ status: 'resolved', notes: [{ text: NOTE }] });
  const { results } = (await call('GET', '/creator/notifications', seed.creator.token)).body.data;
  expect(results[0]).toMatchObject({ title: 'Your support request was resolved' });
});

test('admin sends a push to all creators', async ({ page }) => {
  await as(page, session.admin);
  await page.goto('/notifications');
  await page.getByLabel('Audience').selectOption('creators');
  await expect(page.getByText('1 accounts', { exact: true })).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill(PUSH.title);
  await page.getByLabel('Message', { exact: true }).fill(PUSH.body);
  await page.getByRole('button', { name: 'Send' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Send to 1 accounts?');
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog).toBeHidden();

  // The job sends it in the background, so the history is reloaded until it's done.
  const row = page.getByRole('row', { name: new RegExp(PUSH.title) });
  await expect(async () => {
    await page.reload();
    await expect(row.getByRole('cell')).toHaveText([PUSH.title, 'E2E Superadmin', 'Creators', '1', 'Sent', IST], { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  const { results } = (await call('GET', '/creator/notifications', seed.creator.token)).body.data;
  expect(results[0]).toMatchObject({ title: PUSH.title, body: PUSH.body, type: 'system' });
});

test('admin edits signupGrant and adds a niche, and public GET /niches shows it', async ({ page }) => {
  await as(page, session.admin);
  await page.goto('/settings');
  const grant = page.getByLabel('Signup grant');
  await expect(grant).toHaveValue('20');
  await grant.fill('25');
  await page.getByRole('button', { name: 'Save Connects settings' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  expect((await call('GET', '/admin/settings/connects', session.admin.token)).body.data.config).toMatchObject({ signupGrant: 25 });

  await page.getByLabel('New niche').fill(NICHE);
  await page.getByRole('button', { name: 'Add niche' }).click();
  await expect(page.getByLabel(`Rename ${NICHE}`)).toHaveValue(NICHE);
  await expect(page.getByLabel('New niche')).toHaveValue('');

  // The apps' public list, no token. Writing to it without one is gone (SEC-1).
  const niches = await call('GET', '/niches');
  expect(niches.status).toBe(200);
  expect((niches.body.data.niches as { name: string }[]).map((n) => n.name)).toContain(NICHE);
  expect((await call('POST', '/niches', undefined, { name: 'Anyone can add this' })).status).toBe(404);
  expect((await call('DELETE', `/niches/${(niches.body.data.niches as { _id: string }[])[0]._id}`)).status).toBe(404);

  await page.reload();
  await expect(page.getByLabel('Signup grant')).toHaveValue('25');
});

test('ops cannot open /team', async ({ page }) => {
  await as(page, session.ops);
  await page.goto('/team');
  await expect(page.getByText("This page isn't available for your level.")).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add admin' })).toHaveCount(0);
  expect((await call('GET', '/admin/admins', session.ops.token)).status).toBe(403);
});

test('admin suspends then unsuspends the creator', async ({ page }) => {
  const reason = 'E2E: the same message to every venue';
  await as(page, session.admin);
  await page.goto(`/creators/${seed.creator.id}`);
  await page.getByRole('button', { name: 'Suspend', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Shown to the creator').fill(reason);
  await dialog.getByRole('button', { name: 'Suspend', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(new RegExp(`^Suspended by E2E Superadmin on .+: ${reason}$`))).toBeVisible();
  await expect(page.getByText('Suspended', { exact: true })).toBeVisible();

  // The suspension signed the creator out: its token no longer opens a creator route.
  expect([401, 403]).toContain((await call('GET', '/creator/connects', seed.creator.token)).status);
  expect((await call('GET', `/admin/accounts/creators/${seed.creator.id}`, session.admin.token)).body.data.creator).toMatchObject({ moderationSuspended: true });

  await page.getByRole('button', { name: 'Unsuspend', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Unsuspend', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Account unsuspended');
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Suspend', exact: true })).toBeVisible();
  expect((await call('GET', `/admin/accounts/creators/${seed.creator.id}`, session.admin.token)).body.data.creator).toMatchObject({ moderationSuspended: false });
});
