import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const config = { applicationCost: 2, applicationCostFirst: 1, applicationCostFirstCount: 3, signupGrant: 10, instagramGrant: 5, youtubeGrant: 5, monthlyRefill: 4, balanceCeiling: 100 };

test('saves only changed Connects fields', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /admin/settings/connects': () => ok({ config }),
    'PATCH /admin/settings/connects': (r) => ok({ config: { ...config, ...(r.postDataJSON() as object) } }),
    'GET /admin/niches': () => ok({ niches: [] }),
  });
  await signIn(page);
  await page.goto('/settings');
  await page.getByLabel('Signup grant').fill('12');
  await page.getByLabel('Balance ceiling').fill('150');
  await page.getByRole('button', { name: 'Save Connects settings' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
  expect(calls.filter((r) => r.method() === 'PATCH').map((r) => r.postDataJSON())).toEqual([{ signupGrant: 12, balanceCeiling: 150 }]);
});

test('shows the fixed copy, inline server refusals and blocks out-of-range values', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/settings/connects': () => ok({ config }),
    'PATCH /admin/settings/connects': () => fail(422, 'signupGrant is too high'),
    'GET /admin/niches': () => ok({ niches: [] }),
  });
  await signIn(page);
  await page.goto('/settings');
  await expect(page.getByText('Changes apply within a minute')).toBeVisible();
  await expect(page.getByText('Quest and milestone rewards are set in code')).toBeVisible();
  await page.getByLabel('Signup grant').fill('11');
  await page.getByRole('button', { name: 'Save Connects settings' }).click();
  await expect(page.getByText('signupGrant is too high')).toBeVisible();
  await page.getByLabel('Application cost', { exact: true }).fill('0');
  await expect(page.getByRole('button', { name: 'Save Connects settings' })).toBeDisabled();
});

test('niche add, rename and remove call the right endpoints', async ({ page }) => {
  let niches = [{ _id: 'n1', name: 'Fashion' }];
  const calls = await mockApi(page, {
    'GET /admin/settings/connects': () => ok({ config }),
    'GET /admin/niches': () => ok({ niches }),
    'POST /admin/niches': (r) => { niches = [...niches, { _id: 'n2', name: (r.postDataJSON() as { name: string }).name }]; return ok({}); },
    'PATCH /admin/niches/n1': (r) => { niches = niches.map((n) => (n._id === 'n1' ? { ...n, name: (r.postDataJSON() as { name: string }).name } : n)); return ok({}); },
    'DELETE /admin/niches/n2': () => { niches = niches.filter((n) => n._id !== 'n2'); return ok({}); },
  });
  await signIn(page);
  await page.goto('/settings');
  await page.getByLabel('New niche').fill(' Food ');
  await page.getByRole('button', { name: 'Add niche' }).click();
  await expect(page.getByLabel('Rename Food')).toBeVisible();
  await page.getByLabel('Rename Fashion').fill('Style');
  await page.getByRole('button', { name: 'Save Fashion' }).click();
  await expect(page.getByLabel('Rename Style')).toBeVisible();
  await page.getByRole('button', { name: 'Remove Food' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByLabel('Rename Food')).toHaveCount(0);
  const m = calls.filter((r) => r.method() !== 'GET').map((r) => `${r.method()} ${new URL(r.url()).pathname} ${r.postData() ?? ''}`.trim());
  expect(m).toEqual(['POST /api/admin/niches {"name":"Food"}', 'PATCH /api/admin/niches/n1 {"name":"Style"}', 'DELETE /api/admin/niches/n2']);
});

test('a refused niche removal shows its reason in the dialog, which stays open', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/settings/connects': () => ok({ config }),
    'GET /admin/niches': () => ok({ niches: [{ _id: 'n1', name: 'Fashion' }] }),
    'DELETE /admin/niches/n1': () => fail(400, 'Niche is in use by 12 creators'),
  });
  await signIn(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Remove Fashion' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Remove' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Niche is in use by 12 creators');
  await expect(page.getByText('Niche is in use by 12 creators')).toHaveCount(1); // not also behind the modal
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Niche is in use by 12 creators')).toHaveCount(0);
});
