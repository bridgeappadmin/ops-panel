import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

/** The server's e2e env (server.env.e2e), to pass as process env to the server and the seed script. */
export const serverEnv = parseEnv(readFileSync(path.join(__dirname, 'server.env.e2e'), 'utf8')) as Record<string, string>;
