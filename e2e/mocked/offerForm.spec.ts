import type { Page } from '@playwright/test';
import { fromOffer, toCreateBody, type OfferFormValues } from '../../src/lib/offerForm';
import type { Offer, Venue } from '../../src/lib/types';
import { expect, fail, mockApi, ok, signIn, test } from './helpers';

const offer: Offer = {
  _id: 'o1', brandId: 'b1', title: 'Free coffee', description: 'A cup on us', terms: 'One per person', deliverables: 'One story',
  address: '1 MG Road', location: { type: 'Point', coordinates: [77.59, 12.97] }, discountInr: 150, connectsCost: 40,
  totalCoupons: 20, remainingCoupons: 12, requirements: [], fundedBy: 'brand', voucherValidityDays: 7,
  startsAt: '2026-10-01T00:00:00Z', endsAt: '2099-01-01T12:00:00Z', status: 'active',
  createdBy: 'a', updatedBy: 'a', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
  venue: { _id: 'b1', name: 'Café X', city: 'Bengaluru' },
};
const venue: Venue = { _id: 'b1', name: 'Café X', username: 'cafex', city: 'Bengaluru', phoneNumber: '+91 98450 00000', location: { lat: 12.97, lng: 77.59 } };
const values: OfferFormValues = {
  brandId: 'b1', coords: '12.97, 77.59', address: '1 MG Road', discountInr: '150', connectsCost: '40', totalCoupons: '20', fundedBy: 'brand',
  voucherValidityDays: '7', startsAt: '2026-11-01T10:00', endsAt: '2026-12-01T10:00', requirements: [],
  title: 'Free coffee', description: 'A cup on us', terms: 'One per person', deliverables: '',
};
// What the offer page loads after a save.
const offerPage = { 'GET /admin/offers/o9': () => ok({ offer: { ...offer, _id: 'o9' } }), 'GET /admin/offers/o9/vouchers': () => ok({ vouchers: [] }) };

async function pickVenue(page: Page) {
  await page.getByLabel('Search venues').fill('ca');
  await page.getByRole('button', { name: /Café X/ }).click();
}
async function fillCreate(page: Page) {
  await pickVenue(page);
  await page.getByLabel('Title').fill(values.title);
  await page.getByLabel('Description').fill(values.description);
  await page.getByLabel('Terms and conditions').fill(values.terms);
  await page.getByLabel('Address').fill(values.address);
  await page.getByLabel('Discount (₹)').fill(values.discountInr);
  await page.getByLabel('Cost (Connects)').fill(values.connectsCost);
  await page.getByLabel('Coupons').fill(values.totalCoupons);
  await page.getByLabel('Starts').fill(values.startsAt);
  await page.getByLabel('Ends').fill(values.endsAt);
}

test('searches venues after a pause', async ({ page }) => {
  const calls = await mockApi(page, { 'GET /admin/brands': () => ok({ brands: [venue] }) });
  await signIn(page);
  await page.goto('/offers/new');
  const search = page.getByLabel('Search venues');
  await search.pressSequentially('c');
  await page.waitForTimeout(600);
  expect(calls, 'one character is below the minimum').toHaveLength(0);
  await search.pressSequentially('afe', { delay: 50 });
  await page.waitForTimeout(150); // inside the 300 ms pause after the last keystroke
  expect(calls, 'nothing is sent inside the pause').toHaveLength(0);
  await expect(page.getByRole('button', { name: /Café X/ })).toBeVisible();
  await page.waitForTimeout(300); // room for any extra request
  const searches = calls.filter((r) => r.url().includes('/admin/brands'));
  expect(searches).toHaveLength(1);
  expect(new URL(searches[0].url()).searchParams.get('q')).toBe('cafe');
  const result = page.getByRole('button', { name: /Café X/ });
  await expect(result).toContainText('@cafex');
  await expect(result).toContainText('Bengaluru');
  await expect(result).toContainText('+91 98450 00000');
});

test('prefills coordinates from the venue', async ({ page }) => {
  await mockApi(page, { 'GET /admin/brands': () => ok({ brands: [venue] }) });
  await signIn(page);
  await page.goto('/offers/new');
  await pickVenue(page);
  await expect(page.getByLabel('Coordinates (lat, lng)')).toHaveValue('12.97, 77.59');
});

test('creates the offer and opens it', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /admin/brands': () => ok({ brands: [venue] }),
    'POST /admin/offers': () => ok({ offer: { ...offer, _id: 'o9' } }),
    ...offerPage,
  });
  await signIn(page);
  await page.goto('/offers/new');
  await fillCreate(page);
  await page.getByRole('button', { name: 'Create offer' }).click();
  await expect(page).toHaveURL('/offers/o9');
  const posts = calls.filter((r) => r.method() === 'POST');
  expect(posts).toHaveLength(1);
  expect(posts[0].postDataJSON()).toEqual(toCreateBody(values));
});

test('limits requirements to four', async ({ page }) => {
  await mockApi(page, {});
  await signIn(page);
  await page.goto('/offers/new');
  const add = page.getByRole('button', { name: 'Add requirement' });
  for (let i = 0; i < 4; i++) await add.click();
  await expect(page.getByLabel(/^Minimum/)).toHaveCount(4);
  await expect(add).toBeDisabled();
  await page.getByRole('button', { name: 'Remove requirement 1' }).click();
  await expect(add).toBeEnabled();
});

test('shows the server message above the button', async ({ page }) => {
  await mockApi(page, {
    'GET /admin/brands': () => ok({ brands: [venue] }),
    'POST /admin/offers': () => fail(422, 'Title must be 3–120 characters'),
  });
  await signIn(page);
  await page.goto('/offers/new');
  await fillCreate(page);
  const save = page.getByRole('button', { name: 'Create offer' });
  await save.click();
  const message = page.getByText('Title must be 3–120 characters');
  await expect(message).toBeVisible();
  const [m, b] = [await message.boundingBox(), await save.boundingBox()];
  expect(m!.y + m!.height).toBeLessThanOrEqual(b!.y);
  await expect(save).toBeEnabled();
});

test('creates once on a double click', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /admin/brands': () => ok({ brands: [venue] }),
    'POST /admin/offers': () => ok({ offer: { ...offer, _id: 'o9' } }),
    ...offerPage,
  });
  await signIn(page);
  await page.goto('/offers/new');
  await fillCreate(page);
  await page.getByRole('button', { name: 'Create offer' }).dblclick();
  await expect(page).toHaveURL('/offers/o9');
  expect(calls.filter((r) => r.method() === 'POST')).toHaveLength(1);
});

test('edits only what changed', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /admin/offers/o1': () => ok({ offer }),
    'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [] }),
    'PATCH /admin/offers/o1': () => ok({ offer: { ...offer, title: 'New title' } }),
  });
  await signIn(page);
  await page.goto('/offers/o1/edit');
  await expect(page.getByLabel('Title')).toHaveValue('Free coffee');
  await expect(page.getByText('Café X, Bengaluru')).toBeVisible();
  await expect(page.getByLabel('Starts')).toHaveCount(0);
  await page.getByLabel('Title').fill('New title');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL('/offers/o1');
  const patches = calls.filter((r) => r.method() === 'PATCH');
  expect(patches).toHaveLength(1);
  expect(patches[0].postDataJSON()).toEqual({ title: 'New title' });
  expect(fromOffer(offer).title).toBe('Free coffee');
});
