import { expect, test } from '@playwright/test';
import { offerStatusText } from '../../src/lib/offers';

const startsAt = '2026-10-01T00:00:00Z';

test('labels an expired active offer as ended', () =>
  expect(offerStatusText({ status: 'active', startsAt, endsAt: '2026-10-26T12:00:00Z' }, new Date('2026-10-27T00:00:00Z'))).toBe('ended (26 Oct, 5:30 PM)'));

test('keeps a live offer active, a paused one paused, an ended one ended', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  expect(offerStatusText({ status: 'active', startsAt, endsAt: '2026-10-26T12:00:00Z' }, now)).toBe('active');
  expect(offerStatusText({ status: 'paused', startsAt, endsAt: '2026-10-01T12:00:00Z' }, now)).toBe('paused');
  expect(offerStatusText({ status: 'ended', startsAt, endsAt: '2026-10-26T12:00:00Z' }, now)).toBe('ended');
});

test('labels an active offer that has not started as scheduled', () =>
  expect(offerStatusText({ status: 'active', startsAt: '2026-10-25T12:00:00Z', endsAt: '2026-10-30T12:00:00Z' }, new Date('2026-10-20T00:00:00Z'))).toBe('Scheduled · starts 25 Oct, 5:30 PM'));

test('an offer starting exactly now has started', () =>
  expect(offerStatusText({ status: 'active', startsAt: '2026-10-20T00:00:00Z', endsAt: '2026-10-30T12:00:00Z' }, new Date('2026-10-20T00:00:00Z'))).toBe('active'));

test('a paused future offer stays paused', () =>
  expect(offerStatusText({ status: 'paused', startsAt: '2026-10-25T12:00:00Z', endsAt: '2026-10-30T12:00:00Z' }, new Date('2026-10-20T00:00:00Z'))).toBe('paused'));
