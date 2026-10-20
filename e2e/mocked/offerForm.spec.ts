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
  await page.getByRole('button', { name: 'Enter coordinates instead' }).click();
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
    'POST /admin/offers': () => fail(422, 'Title must be 3-80 characters'),
  });
  await signIn(page);
  await page.goto('/offers/new');
  await fillCreate(page);
  const save = page.getByRole('button', { name: 'Create offer' });
  await save.click();
  const message = page.getByText('Title must be 3-80 characters');
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

const PLACE_URL = 'https://www.google.com/maps/place/Third+Wave+Coffee,+Indiranagar/@12.9784,77.6408,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae1:0xabc!8m2!3d12.9783692!4d77.6408356!16s%2Fg%2F11abc?entry=ttu';
const CENTRE_URL = 'https://www.google.com/maps/@12.9716,77.5946,15z';
const SHORT_URL = 'https://maps.app.goo.gl/AbC123xyz';
const iframeSrc = (page: Page) => page.getByTitle('Map preview').getAttribute('src');
/** The Google iframe is answered locally, so no spec depends on the network. */
async function mockGoogleFrame(page: Page) {
  await page.route('https://maps.google.com/maps*', (r) => r.fulfill({ contentType: 'text/html', body: '<html><body>map</body></html>' }));
}
async function fillRestOfCreate(page: Page) {
  await pickVenue(page);
  await page.getByLabel('Title').fill(values.title);
  await page.getByLabel('Description').fill(values.description);
  await page.getByLabel('Terms and conditions').fill(values.terms);
  await page.getByLabel('Discount (₹)').fill(values.discountInr);
  await page.getByLabel('Cost (Connects)').fill(values.connectsCost);
  await page.getByLabel('Coupons').fill(values.totalCoupons);
  await page.getByLabel('Starts').fill(values.startsAt);
  await page.getByLabel('Ends').fill(values.endsAt);
}

test.describe('Google Maps link', () => {
  test('a full link fills coordinates, preview and an empty address, and the POST carries them', async ({ page }) => {
    await mockGoogleFrame(page);
    const calls = await mockApi(page, {
      'GET /admin/brands': () => ok({ brands: [venue] }),
      'POST /admin/offers': () => ok({ offer: { ...offer, _id: 'o9' } }),
      ...offerPage,
    });
    await signIn(page);
    await page.goto('/offers/new');
    await fillRestOfCreate(page);
    await page.getByLabel('Google Maps link').fill(PLACE_URL);
    await expect(page.getByLabel('Address')).toHaveValue('Third Wave Coffee, Indiranagar');
    await expect(page.getByText('12.9783692, 77.6408356')).toBeVisible();
    expect(await iframeSrc(page)).toBe('https://maps.google.com/maps?q=12.9783692,77.6408356&z=16&output=embed');
    const open = page.getByRole('link', { name: 'Open in Google Maps' });
    await expect(open).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=12.9783692,77.6408356');
    await expect(open).toHaveAttribute('target', '_blank');
    await expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByText(/map's centre/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Create offer' }).click();
    await expect(page).toHaveURL('/offers/o9');
    const post = calls.find((r) => r.method() === 'POST')!.postDataJSON();
    expect(post).toMatchObject({ lat: 12.9783692, lng: 77.6408356, address: 'Third Wave Coffee, Indiranagar' });
  });

  test('pasting (not typing) a link works', async ({ page }) => {
    await mockGoogleFrame(page);
    await mockApi(page, {});
    await signIn(page);
    await page.goto('/offers/new');
    const field = page.getByLabel('Google Maps link');
    await field.focus();
    await page.evaluate((text) => {
      const el = document.activeElement as HTMLInputElement;
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, PLACE_URL);
    await expect(page.getByText('12.9783692, 77.6408356')).toBeVisible();
  });

  test('a short link is expanded by /maps-link', async ({ page }) => {
    await mockGoogleFrame(page);
    await mockApi(page, {});
    const asked: string[] = [];
    await page.route('**/maps-link*', (r) => {
      asked.push(new URL(r.request().url()).searchParams.get('url') ?? '');
      return r.fulfill({ json: { url: PLACE_URL } });
    });
    await signIn(page);
    await page.goto('/offers/new');
    await page.getByLabel('Google Maps link').fill(SHORT_URL);
    await expect(page.getByText('12.9783692, 77.6408356')).toBeVisible();
    expect(asked.at(-1)).toBe(SHORT_URL);
  });

  test('a short link that cannot be resolved shows the route message', async ({ page }) => {
    await mockApi(page, {});
    await page.route('**/maps-link*', (r) => r.fulfill({ status: 400, json: { message: 'That link leads somewhere other than Google Maps.' } }));
    await signIn(page);
    await page.goto('/offers/new');
    await page.getByLabel('Google Maps link').fill(SHORT_URL);
    await expect(page.getByText('That link leads somewhere other than Google Maps.')).toBeVisible();
  });

  test('a link that is not a Google Maps place shows the hint', async ({ page }) => {
    await mockApi(page, {});
    await signIn(page);
    await page.goto('/offers/new');
    await page.getByLabel('Google Maps link').fill('https://example.com/not-maps');
    await expect(page.getByText("This isn't a Google Maps place link. In Google Maps, open the café and use Share → Copy link.")).toBeVisible();
    await expect(page.getByTitle('Map preview')).toHaveCount(0);
  });

  test('a centre-only link says so', async ({ page }) => {
    await mockGoogleFrame(page);
    await mockApi(page, {});
    await signIn(page);
    await page.goto('/offers/new');
    await page.getByLabel('Google Maps link').fill(CENTRE_URL);
    await expect(page.getByText(/map's centre, not a pinned place/)).toBeVisible();
    await expect(page.getByText(/Share link/)).toBeVisible();
  });

  test('a typed address is not overwritten', async ({ page }) => {
    await mockGoogleFrame(page);
    await mockApi(page, {});
    await signIn(page);
    await page.goto('/offers/new');
    await page.getByLabel('Address').fill('My own address');
    await page.getByLabel('Google Maps link').fill(PLACE_URL);
    await expect(page.getByText('12.9783692, 77.6408356')).toBeVisible();
    await expect(page.getByLabel('Address')).toHaveValue('My own address');
  });

  test('"Enter coordinates instead" reveals the manual field', async ({ page }) => {
    await mockGoogleFrame(page);
    await mockApi(page, {});
    await signIn(page);
    await page.goto('/offers/new');
    await expect(page.getByLabel('Coordinates (lat, lng)')).toHaveCount(0);
    await page.getByRole('button', { name: 'Enter coordinates instead' }).click();
    await page.getByLabel('Coordinates (lat, lng)').fill('12.5, 77.5');
    expect(await iframeSrc(page)).toBe('https://maps.google.com/maps?q=12.5,77.5&z=16&output=embed');
  });

  test('a venue with a saved location shows the preview', async ({ page }) => {
    await mockGoogleFrame(page);
    await mockApi(page, { 'GET /admin/brands': () => ok({ brands: [venue] }) });
    await signIn(page);
    await page.goto('/offers/new');
    await pickVenue(page);
    expect(await iframeSrc(page)).toBe('https://maps.google.com/maps?q=12.97,77.59&z=16&output=embed');
  });

  test('the edit page previews the offer and a new link sends lat and lng', async ({ page }) => {
    await mockGoogleFrame(page);
    const calls = await mockApi(page, {
      'GET /admin/offers/o1': () => ok({ offer }),
      'GET /admin/offers/o1/vouchers': () => ok({ vouchers: [] }),
      'PATCH /admin/offers/o1': () => ok({ offer }),
    });
    await signIn(page);
    await page.goto('/offers/o1/edit');
    await expect.poll(() => iframeSrc(page)).toBe('https://maps.google.com/maps?q=12.97,77.59&z=16&output=embed');
    await page.getByLabel('Google Maps link').fill(PLACE_URL);
    await expect(page.getByText('12.9783692, 77.6408356')).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL('/offers/o1');
    const patch = calls.find((r) => r.method() === 'PATCH')!.postDataJSON();
    expect(patch).toMatchObject({ lat: 12.9783692, lng: 77.6408356 });
  });
});

test('pre-fills Starts with the current local time to the minute', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 1, 10, 7, 45) });
  await mockApi(page, {});
  await signIn(page);
  await page.goto('/offers/new');
  await expect(page.getByLabel('Starts')).toHaveValue('2026-11-01T10:07');
});
