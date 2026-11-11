import { test as base, expect, type Page } from '@playwright/test';

// Fails a test on an uncaught error in a page, or a 5xx from the server, even where the page didn't show it.
let problems: string[] = [];
export function watch(page: Page) {
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('response', (res) => { if (res.status() >= 500) problems.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
}
export const test = base.extend<{ guard: void }>({
  guard: [async ({ page }, use) => {
    problems = [];
    watch(page);
    await use();
    expect(problems).toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
