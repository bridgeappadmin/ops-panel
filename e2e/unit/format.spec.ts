import { expect, test } from '@playwright/test';
import { currentIstMonth, formatIstDateTime, formatIstTime, formatNumber } from '../../src/lib/format';

test('formats IST time', () => expect(formatIstTime('2026-10-19T14:12:00Z')).toBe('7:42 PM'));
test('formats IST date-time', () => expect(formatIstDateTime('2026-10-26T12:00:00Z')).toBe('26 Oct, 5:30 PM'));
test('handles midnight and noon', () => {
  expect(formatIstDateTime('2026-10-19T18:30:00Z')).toBe('20 Oct, 12:00 AM');
  expect(formatIstTime('2026-10-19T06:30:00Z')).toBe('12:00 PM');
});
test('defaults the month in IST', () => expect(currentIstMonth(new Date('2026-10-31T19:00:00Z'))).toBe('2026-11'));
test('groups numbers the Indian way', () => expect(formatNumber(100000)).toBe('1,00,000'));
