import { expect, test } from '@playwright/test';
import { isShortMapsLink, parseMapsLink } from '../../src/lib/mapsLink';

const PLACE = 'https://www.google.com/maps/place/Third+Wave+Coffee,+Indiranagar/@12.9784,77.6408,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae1:0xabc!8m2!3d12.9783692!4d77.6408356!16s%2Fg%2F11abc?entry=ttu';

test('uses the !3d/!4d pin and the decoded name', () =>
  expect(parseMapsLink(PLACE)).toEqual({ lat: 12.9783692, lng: 77.6408356, name: 'Third Wave Coffee, Indiranagar', exact: true }));

test('decodes percent-escapes in the name', () =>
  expect(parseMapsLink('https://www.google.com/maps/place/Caf%C3%A9+X/@12.9,77.5,17z/data=!3d12.91!4d77.51')?.name).toBe('Café X'));

test('an @ centre alone is not exact', () =>
  expect(parseMapsLink('https://www.google.com/maps/@12.9716,77.5946,15z')).toEqual({ lat: 12.9716, lng: 77.5946, exact: false }));

test('a place link with only a centre is not exact but has the name', () =>
  expect(parseMapsLink('https://www.google.com/maps/place/Blue+Tokai/@12.97,77.59,17z')).toEqual({ lat: 12.97, lng: 77.59, name: 'Blue Tokai', exact: false }));

test('reads q=, query=, ll= coordinates as exact', () => {
  const want = { lat: 12.9716, lng: 77.5946, exact: true };
  expect(parseMapsLink('https://maps.google.com/?q=12.9716,77.5946')).toEqual(want);
  expect(parseMapsLink('https://www.google.com/maps?q=12.9716%2C77.5946')).toEqual(want);
  expect(parseMapsLink('https://www.google.com/maps/search/?api=1&query=12.9716,77.5946')).toEqual(want);
  expect(parseMapsLink('https://maps.google.com/maps?ll=12.9716,77.5946&z=10')).toEqual(want);
});

test('reads /search/lat,+lng and /place/lat,lng', () => {
  expect(parseMapsLink('https://www.google.com/maps/search/12.9716,+77.5946')).toEqual({ lat: 12.9716, lng: 77.5946, exact: true });
  expect(parseMapsLink('https://www.google.com/maps/place/12.9716,77.5946')).toEqual({ lat: 12.9716, lng: 77.5946, exact: true });
  expect(parseMapsLink('https://www.google.co.in/maps/place/12.9716,77.5946/@12.9,77.5,17z')).toEqual({ lat: 12.9716, lng: 77.5946, exact: true });
});

test('handles negative coordinates', () =>
  expect(parseMapsLink('https://www.google.com/maps/@-33.8688,151.2093,12z')).toMatchObject({ lat: -33.8688, lng: 151.2093 }));

test('rejects out-of-range values, garbage and other hosts', () => {
  expect(parseMapsLink('https://www.google.com/maps/@91,77.5,15z')).toBeNull();
  expect(parseMapsLink('https://maps.google.com/?q=12,181')).toBeNull();
  expect(parseMapsLink('not a url')).toBeNull();
  expect(parseMapsLink('')).toBeNull();
  expect(parseMapsLink('https://www.google.com/maps/place/Nowhere')).toBeNull();
  expect(parseMapsLink('https://evil.example/maps/@12.9,77.5,15z')).toBeNull();
  expect(parseMapsLink('https://google.com.evil.example/maps/@12.9,77.5,15z')).toBeNull();
  expect(parseMapsLink('https://notgoogle.com/maps/@12.9,77.5,15z')).toBeNull();
  expect(parseMapsLink('https://www.google.com/search?q=12.9,77.5')).toBeNull();
  expect(parseMapsLink('http://www.google.com/maps/@12.9,77.5,15z')).toBeNull();
  expect(parseMapsLink('http://maps.google.com/?q=12.9,77.5')).toBeNull();
});

test('isShortMapsLink', () => {
  expect(isShortMapsLink('https://maps.app.goo.gl/AbC123xyz')).toBe(true);
  expect(isShortMapsLink('https://goo.gl/maps/AbC123xyz')).toBe(true);
  expect(isShortMapsLink('http://maps.app.goo.gl/AbC123')).toBe(false);
  expect(isShortMapsLink('https://goo.gl/other')).toBe(false);
  expect(isShortMapsLink('https://evil.example/maps.app.goo.gl/x')).toBe(false);
  expect(isShortMapsLink('https://www.google.com/maps/@12,77,15z')).toBe(false);
  expect(isShortMapsLink('nope')).toBe(false);
});

test('accepts google.com, country domains and rejects lookalike TLDs and ports', () => {
  const at = (host: string) => parseMapsLink(`https://${host}/maps/@12.9,77.5,15z`);
  for (const ok of ['www.google.co.in', 'google.com', 'www.google.com.au', 'www.google.de']) expect(at(ok), ok).not.toBeNull();
  expect(parseMapsLink('https://maps.google.com/?q=12.9,77.5')).not.toBeNull();
  for (const bad of ['www.google.com.xyz', 'www.google.co.com', 'www.google.com.net', 'www.google.com:22', 'google.com:8443']) expect(at(bad), bad).toBeNull();
  expect(parseMapsLink('https://maps.google.top/?q=12.9,77.5')).toBeNull();
  expect(parseMapsLink('https://maps.google.com:8080/?q=12.9,77.5')).toBeNull();
});

test('a degrees-minutes-seconds place segment is coordinates, not a name', () => {
  const p = parseMapsLink(`https://www.google.com/maps/place/12%C2%B058'17.8%22N+77%C2%B035'40.6%22E/@12.97,77.59,17z`);
  expect(p?.name).toBeUndefined();
  expect(p?.exact).toBe(true);
  expect(p!.lat).toBeCloseTo(12.971611, 5);
  expect(p!.lng).toBeCloseTo(77.594611, 5);
  expect(parseMapsLink(`https://www.google.com/maps/place/33%C2%B052'7.7%22S+151%C2%B012'33.5%22W`)).toMatchObject({ lat: expect.closeTo(-33.8688, 3), lng: expect.closeTo(-151.2093, 3) });
});
