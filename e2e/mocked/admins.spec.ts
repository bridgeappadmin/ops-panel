import type { AdminAccount } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

type Call = { method(): string; url(): string; postDataJSON(): unknown };
const acct = (over: Partial<AdminAccount> = {}): AdminAccount => ({
  _id: 'a2', name: 'Ravi', email: 'ravi@tazmify.com', role: 'ops', disabled: false, createdAt: '2026-10-01T00:00:00Z', ...over,
});
const gets = (calls: Call[]) => calls.filter((r) => r.method() === 'GET' && r.url().endsWith('/admin/admins')).length;
const bodies = (calls: Call[], method: string, suffix: string) => calls.filter((r) => r.method() === method && r.url().endsWith(suffix)).map((r) => r.postDataJSON());

test('lists admins', async ({ page }) => {
  await mockApi(page, { 'GET /admin/admins': () => ok({ admins: [acct(), acct({ _id: 'a3', name: 'Mina', email: 'mina@tazmify.com', role: 'superadmin', disabled: true })] }) });
  await signIn(page);
  await page.goto('/admins');
  const ravi = page.getByRole('row', { name: /Ravi/ });
  await expect(ravi).toContainText('ravi@tazmify.com');
  await expect(ravi).toContainText('ops');
  await expect(ravi).toContainText('Active');
  const mina = page.getByRole('row', { name: /Mina/ });
  await expect(mina).toContainText('superadmin');
  await expect(mina).toContainText('Disabled');
});

test('adds an admin', async ({ page }) => {
  let added = false;
  const calls = await mockApi(page, {
    'GET /admin/admins': () => ok({ admins: added ? [acct()] : [] }),
    'POST /admin/admins': () => { added = true; return ok({ admin: acct() }); },
  });
  await signIn(page);
  await page.goto('/admins');
  await page.getByLabel('Name').fill(' Ravi ');
  await page.getByLabel('Email').fill(' ravi@tazmify.com ');
  await page.getByLabel('Role').selectOption('ops');
  await page.getByLabel('Temporary password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Add admin' }).click();
  await expect(page.getByText('Admin added')).toBeVisible();
  await expect(page.getByRole('row', { name: /Ravi/ })).toBeVisible();
  expect(bodies(calls, 'POST', '/admin/admins')).toEqual([{ name: 'Ravi', email: 'ravi@tazmify.com', role: 'ops', password: 'correct horse battery' }]);
  await expect(page.getByLabel('Name')).toHaveValue('');
  await expect(page.getByLabel('Temporary password')).toHaveValue('');
});

test('shows a refused add next to the form', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/admins': () => ok({ admins: [acct()] }),
    'POST /admin/admins': () => fail(400, 'An admin with this email already exists'),
  });
  await signIn(page);
  await page.goto('/admins');
  await page.getByLabel('Name').fill('Ravi Two');
  await page.getByLabel('Email').fill('ravi@tazmify.com');
  await page.getByLabel('Temporary password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Add admin' }).click();
  // Above the form's button, not above the table: the page's only alert, inside the form.
  await expect(page.locator('form').getByRole('alert')).toHaveText('An admin with this email already exists');
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(1);
  await expect(page.getByLabel('Email')).toHaveValue('ravi@tazmify.com'); // kept, to fix and resend
});

test('disables and switches role', async ({ page }) => {
  let a = acct();
  const calls = await mockApi(page, {
    'GET /admin/admins': () => ok({ admins: [a] }),
    'PATCH /admin/admins/a2': (req) => { a = { ...a, ...(req.postDataJSON() as Partial<AdminAccount>) }; return ok({ admin: a }); },
  });
  await signIn(page);
  await page.goto('/admins');
  const row = page.getByRole('row', { name: /Ravi/ });
  await row.getByRole('button', { name: 'Disable' }).click();
  await expect(row).toContainText('Disabled');
  await row.getByRole('button', { name: 'Make Superadmin' }).click();
  await expect(row).toContainText('superadmin');
  expect(bodies(calls, 'PATCH', '/admin/admins/a2')).toEqual([{ disabled: true }, { role: 'superadmin' }]);
  const before = gets(calls);
  await row.getByRole('button', { name: 'Enable' }).click();
  await expect.poll(() => gets(calls)).toBe(before + 1);
});

test('resets a password in a masked field', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /admin/admins': () => ok({ admins: [acct()] }),
    'POST /admin/admins/a2/reset-password': () => ok({}),
  });
  await signIn(page);
  await page.goto('/admins');
  await page.getByRole('row', { name: /Ravi/ }).getByRole('button', { name: 'Reset password' }).click();
  const dialog = page.getByRole('dialog');
  const field = dialog.getByLabel('New password');
  await expect(field).toHaveAttribute('type', 'password');
  await field.fill('elevenchars');
  await dialog.getByRole('button', { name: 'Reset password' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Password must be 12-200 characters');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(500); // a POST, if one were sent, would have landed by now
  expect(bodies(calls, 'POST', '/reset-password')).toEqual([]);
  await field.fill('twelve chars'); // exactly 12: accepted
  await dialog.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Password reset')).toBeVisible();
  await expect(dialog).toBeHidden();
  expect(bodies(calls, 'POST', '/reset-password')).toEqual([{ password: 'twelve chars' }]);
});

test('shows a refused reset inside the dialog', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/admins': () => ok({ admins: [acct()] }),
    'POST /admin/admins/a2/reset-password': () => fail(404, 'Admin not found'),
  });
  await signIn(page);
  await page.goto('/admins');
  await page.getByRole('row', { name: /Ravi/ }).getByRole('button', { name: 'Reset password' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('New password').fill('twelve chars');
  await dialog.getByRole('button', { name: 'Reset password' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Admin not found');
  await expect(dialog).toBeVisible();
});

test('shows the self-change refusal', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/admins': () => ok({ admins: [acct({ _id: 'a1', name: 'Asha', role: 'superadmin' })] }),
    'PATCH /admin/admins/a1': () => fail(400, "You can't change your own role or disable yourself"),
  });
  await signIn(page);
  await page.goto('/admins');
  await page.getByRole('row', { name: /Asha/ }).getByRole('button', { name: 'Disable' }).click();
  await expect(page.getByText("You can't change your own role or disable yourself")).toBeVisible();
});

test('blocks ops from admin accounts', async ({ page }) => {
  await mockApi(page, { 'GET /admin/admins': () => fail(403, 'Not allowed for your role') });
  await signIn(page, { role: 'ops' });
  await page.goto('/admins');
  await expect(page.getByText('Not allowed for your role')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add admin' })).toHaveCount(0);
});
