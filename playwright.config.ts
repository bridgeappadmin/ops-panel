import { defineConfig, devices } from '@playwright/test';
import { serverEnv } from './e2e/stack/env';
import { E2E_APP_URL, SEED_FILE, SERVER_URL } from './e2e/real/global-setup';

const PORT = 3100;

// webServer and globalSetup are global to a run, so the real stack starts only when the e2e project is picked
// (`--project=e2e`, run on its own), and next dev only otherwise. Workers re-read this file without the CLI flags,
// so the choice is handed to them in the environment.
if (process.argv.some((arg, i, all) => arg === '--project=e2e' || (arg === '--project' && all[i + 1] === 'e2e'))) process.env.OPS_E2E = '1';
const realStack = process.env.OPS_E2E === '1';

export default defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  projects: [
    // Node-only: specs import src/lib modules directly; no page fixture, so no browser starts.
    { name: 'unit', testDir: 'e2e/unit' },
    // Browser specs against `next dev`; every /api call is answered by mockApi() in e2e/mocked/helpers.ts.
    { name: 'mocked', testDir: 'e2e/mocked', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORT}` } },
    // The built Ops app against the real server, MongoDB and Redis (e2e/stack). `npm run test:e2e`.
    ...(realStack ? [{ name: 'e2e', testDir: 'e2e/real', timeout: 60_000, use: { ...devices['Desktop Chrome'], baseURL: E2E_APP_URL } }] : []),
  ],
  globalSetup: realStack ? './e2e/real/global-setup.ts' : undefined,
  webServer: realStack
    ? [
        {
          name: 'server',
          // The seed drops the database, so it runs before the server boots (which builds the indexes). Its JSON
          // goes to a file for global-setup.ts. A fresh server per run also means a fresh admin sign-in limit.
          command: `npm --silent --prefix ../server run e2e:seed > "${SEED_FILE}" && npm --prefix ../server run dev`,
          url: `${SERVER_URL}/health`,
          env: serverEnv,
          reuseExistingServer: false,
          timeout: 180_000,
        },
        {
          name: 'ops',
          // A production build, since OPS_API_URL is baked in at build time. next dev writes .next/dev, which
          // next build leaves alone, so the mocked dev server and this build don't clobber each other.
          command: `npx next build && npx next start -H 127.0.0.1 -p ${new URL(E2E_APP_URL).port}`,
          url: `${E2E_APP_URL}/login`,
          env: { OPS_API_URL: SERVER_URL },
          reuseExistingServer: false,
          timeout: 300_000,
        },
      ]
    : {
        // ponytail: one webServer for unit and mocked, so `--project=unit` starts next dev too. Split if that gets slow.
        command: `npx next dev --port ${PORT}`,
        port: PORT,
        // Nothing listens on port 9: an un-mocked call that slips past mockApi still can't reach a real server.
        env: { OPS_API_URL: 'http://127.0.0.1:9' },
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
