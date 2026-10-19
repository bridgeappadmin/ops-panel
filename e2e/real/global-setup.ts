import { readFileSync } from 'node:fs';
import path from 'node:path';

export const SERVER_URL = 'http://127.0.0.1:4010';
// Not 3100: the mocked project's next dev holds that port, with a different OPS_API_URL.
export const E2E_APP_URL = 'http://127.0.0.1:3200';
/** Written by the server webServer's `e2e:seed` (playwright.config.ts), before the server starts. Git-ignored. */
export const SEED_FILE = path.join(__dirname, '.seed.json');

/** What server/src/scripts/e2e-seed.ts prints. */
export interface E2eSeed {
  superadmin: { email: string; password: string; id: string };
  ops: { email: string; password: string; id: string };
  brand: { id: string; token: string; name: string; city: string };
  creator: { id: string; token: string; balance: number };
}

/** The spec's copy of the seed, handed over by globalSetup. */
export const seed = (): E2eSeed => JSON.parse(process.env.E2E_SEED ?? 'null');

// Runs after the webServers are up: checks the server sees MongoDB and Redis, then hands the seed to the workers.
export default async function globalSetup() {
  const health = await (await fetch(`${SERVER_URL}/health`)).json();
  if (health?.data?.mongo !== true || health?.data?.redis !== true) throw new Error(`The e2e stack is not healthy: ${JSON.stringify(health)}`);

  const lines = readFileSync(SEED_FILE, 'utf8').trim().split('\n');
  const parsed = JSON.parse(lines[lines.length - 1]) as E2eSeed;
  const token = (t: unknown) => typeof t === 'string' && t.split('.').length === 3;
  if (!parsed.superadmin?.password || !parsed.ops?.password || !token(parsed.brand?.token) || !token(parsed.creator?.token)) {
    throw new Error(`Unexpected e2e seed: ${lines.join('\n')}`);
  }
  process.env.E2E_SEED = JSON.stringify(parsed);
}
