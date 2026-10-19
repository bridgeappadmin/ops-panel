import { expect, test } from '@playwright/test';
import { offerStatusText } from '../../src/lib/offers';

test('labels an expired active offer as ended', () =>
  expect(offerStatusText({ status: 'active', endsAt: '2026-10-26T12:00:00Z' }, new Date('2026-10-27T00:00:00Z'))).toBe('ended (26 Oct, 5:30 PM)'));

test('keeps a live offer active, a paused one paused, an ended one ended', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  expect(offerStatusText({ status: 'active', endsAt: '2026-10-26T12:00:00Z' }, now)).toBe('active');
  expect(offerStatusText({ status: 'paused', endsAt: '2026-10-01T12:00:00Z' }, now)).toBe('paused');
  expect(offerStatusText({ status: 'ended', endsAt: '2026-10-26T12:00:00Z' }, now)).toBe('ended');
});
