import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  projects: [
    // Node-only: specs import src/lib modules directly; no page fixture, so no browser starts.
    { name: 'unit', testDir: 'e2e/unit' },
    // Browser specs against `next dev`; every /api call is answered by mockApi() in e2e/mocked/helpers.ts.
    { name: 'mocked', testDir: 'e2e/mocked', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORT}` } },
  ],
  // ponytail: one global webServer, so `--project=unit` starts next dev too. Split configs if that gets slow.
  webServer: {
    command: `npx next dev --port ${PORT}`,
    port: PORT,
    // Nothing listens on port 9: an un-mocked call that slips past mockApi still can't reach a real server.
    env: { OPS_API_URL: 'http://127.0.0.1:9' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
