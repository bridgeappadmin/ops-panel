import { expect, test } from '@playwright/test';
import { canOpen, homeFor, SECTIONS } from '../../src/lib/roles';

test('homeFor gives each level its landing', () => {
  expect(homeFor('superadmin')).toBe('/dashboard');
  expect(homeFor('ops')).toBe('/offers');
  expect(homeFor('intern')).toBe('/tickets');
});

test('canOpen follows the level', () => {
  expect(canOpen('intern', '/settings')).toBe(false);
  expect(canOpen('intern', '/creators/abc')).toBe(true);
  expect(canOpen('ops', '/offers/new')).toBe(true);
  expect(canOpen('ops', '/dashboard')).toBe(false);
  expect(canOpen('ops', '/login')).toBe(true); // no section: open
});

test('Admin sees every section', () => {
  for (const s of SECTIONS) expect(s.roles, s.href).toContain('superadmin');
});
