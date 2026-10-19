import { test as base, expect, type Page, type Request } from '@playwright/test';
import type { Session } from '../../src/lib/types';

export type Reply = { status?: number; json?: unknown; body?: string; contentType?: string };
// A handler may answer later (a Promise), to hold a request in flight.
type Routes = Record<string, (req: Request) => Reply | Promise<Reply>>;

const isApi = (url: URL) => url.pathname.startsWith('/api/');
// 'GET /admin/budget' for GET /api/admin/budget?x=1: the query is left for the handler to check.
const keyOf = (req: Request) => `${req.method()} ${new URL(req.url()).pathname.replace(/^\/api/, '')}`;

/**
 * The spec's `test`. Every page gets a catch-all /api route that answers 599 and records the call. After the test
 * body, it fails listing every /api call no mockApi() handler answered, and every uncaught error in the page.
 */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const misses: string[] = [];
      const crashes: string[] = [];
      page.on('pageerror', (error) => crashes.push(error.message));
      await page.route(isApi, (route) => {
        misses.push(keyOf(route.request()));
        return route.fulfill({ status: 599, contentType: 'text/plain', body: `Not mocked: ${keyOf(route.request())}` });
      });
      await use();
      expect(misses, 'these /api calls had no mockApi() handler').toEqual([]);
      expect(crashes, 'uncaught errors in the page').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Answers /api calls by 'METHOD /path' key. Returns every /api request the page makes from now on, in order. */
export async function mockApi(page: Page, routes: Routes): Promise<Request[]> {
  const calls: Request[] = [];
  await page.route(isApi, async (route) => {
    const req = route.request();
    calls.push(req);
    const handler = routes[keyOf(req)];
    if (!handler) return route.fallback(); // to the catch-all, which fails the test
    const { status = 200, json, body, contentType } = await handler(req);
    await route.fulfill({
      status,
      contentType: contentType ?? (json === undefined ? 'text/plain' : 'application/json'),
      body: json === undefined ? body ?? '' : JSON.stringify(json),
    });
  });
  return calls;
}

/** The `/admin/*` envelope. */
export const ok = (data: unknown): Reply => ({ json: { success: true, statusCode: 200, data } });
/** The server's error body (error-handler.middleware.ts). */
export const fail = (status: number, message: string): Reply => ({ status, json: { success: false, statusCode: status, message } });

/** Seeds a session in sessionStorage. Opens a static file first, since storage needs the app's origin. */
export async function signIn(page: Page, s: Partial<Session> = {}): Promise<void> {
  const full: Session = { token: 'test-token', role: 'superadmin', name: 'Asha', ...s };
  await page.goto('/icon.svg');
  await page.evaluate(({ token, role, name }) => {
    sessionStorage.setItem('ops.token', token);
    sessionStorage.setItem('ops.role', role);
    sessionStorage.setItem('ops.name', name);
  }, full);
}

export const storedToken = (page: Page) => page.evaluate(() => sessionStorage.getItem('ops.token'));
