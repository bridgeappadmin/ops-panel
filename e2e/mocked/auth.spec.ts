import { expect, fail, mockApi, ok, signIn, storedToken, test } from './helpers';

const budget = () => ok({ month: '2026-10', usedConnects: 32500, capConnects: 50000 });
const offers = () => ok({ results: [], total: 0, page: 1, totalPages: 0 });

async function submitLogin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('asha@tazmify.com');
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('signs in and lands on offers', async ({ page }) => {
  const calls = await mockApi(page, {
    'POST /moderation/login': () => ({ json: { accessToken: 't', role: 'superadmin', name: 'Asha' } }),
    'GET /admin/budget': budget,
    'GET /admin/offers': offers,
  });
  await submitLogin(page);
  await expect(page).toHaveURL('/offers');
  expect(await storedToken(page)).toBe('t');
  await expect(page.getByRole('link', { name: 'Admins' })).toBeVisible();
  await expect(page.getByText('Asha')).toBeVisible();

  const login = calls.find((r) => r.url().endsWith('/api/moderation/login'))!;
  expect(login.postDataJSON()).toEqual({ email: 'asha@tazmify.com', password: 'correct horse battery' });
  // The offers page's calls carry the new token.
  const after = calls.find((r) => r.url().includes('/api/admin/'))!;
  expect(after.headers().authorization).toBe('Bearer t');
});

test('shows the server message on a bad password', async ({ page }) => {
  await mockApi(page, { 'POST /moderation/login': () => fail(401, 'Invalid moderator credentials') });
  await submitLogin(page);
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid moderator credentials' })).toBeVisible();
  // The message sits on the Password field, which takes the danger border (--color-danger #E4484D).
  const password = page.getByLabel('Password');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveCSS('border-top-color', 'rgb(228, 72, 77)');
  await expect(page).toHaveURL('/login');
  expect(await storedToken(page)).toBeNull();
});

test('falls back on a plain-text error', async ({ page }) => {
  // express-rate-limit's default 429 is plain text.
  await mockApi(page, { 'POST /moderation/login': () => ({ status: 429, body: 'Too many requests', contentType: 'text/plain' }) });
  await submitLogin(page);
  await expect(page.getByText('Something went wrong')).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('sends signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/offers');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('sends signed-in visitors on to offers', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/offers': offers });
  await signIn(page);
  await page.goto('/login');
  await expect(page).toHaveURL('/offers');
});

test('drops an expired session', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/budget': () => fail(401, 'jwt expired'), 'GET /admin/offers': offers });
  await signIn(page);
  await page.goto('/offers');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  expect(await storedToken(page)).toBeNull();

  // No redirect loop and nothing more sent: still on /login, and no new /api call, a moment later.
  const landed = calls.length;
  await page.waitForTimeout(750);
  await expect(page).toHaveURL('/login');
  expect(calls.length).toBe(landed);
});

test('hides Admins for ops', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/offers': offers });
  await signIn(page, { role: 'ops', name: 'Ravi' });
  await page.goto('/offers');
  await expect(page.getByText('Ravi')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Offers' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admins' })).toHaveCount(0);
});

test('signs out', async ({ page }) => {
  await mockApi(page, { 'GET /admin/budget': budget, 'GET /admin/offers': offers });
  await signIn(page);
  await page.goto('/offers');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');
  expect(await page.evaluate(() => ['ops.token', 'ops.role', 'ops.name'].map((k) => sessionStorage.getItem(k)))).toEqual([null, null, null]);
});

test('forbids framing', async ({ page }) => {
  for (const path of ['/login', '/offers']) {
    const headers = (await page.goto(path))!.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toBe("frame-ancestors 'none'");
  }
});
