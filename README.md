# Tazmify Ops

The Ops web app: venue offers, the Tazmify-funded budget, voucher lookup and Cancel & refund, the monthly
redemptions report, and admin accounts. Next.js (App Router) + Tailwind, client-rendered; it talks to the Tazmify
server through a same-origin proxy.

## Setup

```sh
npm install
cp .env.example .env.local   # then point OPS_API_URL at the server
```

| Variable | Example | Meaning |
| --- | --- | --- |
| `OPS_API_URL` | `http://localhost:4010` | The Tazmify server's root URL (no `/v1`). The browser calls `/api/<path>` on this app, and a Next.js rewrite forwards it to `${OPS_API_URL}/<path>`. |

`OPS_API_URL` is read when `next.config.ts` loads: by `npm run dev` at start-up, and by `npm run build` for
production. **The built app keeps the value it was built with**, so set it before `npm run build` and rebuild to
change it. `npm start` does not re-read it.

## Run

```sh
npm run dev          # http://localhost:3000
npm run build && npm start
```

Sign in with an existing admin account (role `ops` or `superadmin`). The session lives in `sessionStorage`:
a reload keeps you signed in, closing the tab signs you out.

## Checks

```sh
npm run lint
npm run typecheck
npm run test:unit    # specs in e2e/unit that import src/lib directly (no browser page)
npm run test:mocked  # browser specs in e2e/mocked against `next dev`, every /api call mocked
```

First time only: `npx playwright install chromium`.

Playwright's `webServer` is global, so both projects (`test:unit` too) start `next dev` on port 3100 with
`OPS_API_URL=http://127.0.0.1:9` (nothing listens there). Each mocked spec answers `/api/*` with
`mockApi()` from `e2e/mocked/helpers.ts`; a call a spec didn't mock fails the test.

## Local stack (real server)

`npm run stack:up` starts MongoDB 7 on `127.0.0.1:27017` and Redis 7 on `127.0.0.1:6380` (not 6379, which a
developer's own Redis often holds) from `e2e/stack/docker-compose.yml`; `npm run stack:down` removes them and
their data. `e2e/stack/server.env.e2e` is the server's env for that stack (all secrets fake), passed as process env,
never as `server/.env`; `e2e/stack/env.ts` parses it for Playwright. With `server/` next to `ops/`, from Git Bash:

```sh
cd ../server
set -a; . ../ops/e2e/stack/server.env.e2e; set +a
npm run --silent e2e:seed   # drops tazmify_e2e, seeds admins, a venue and a creator, prints one line of JSON
npm run dev                 # http://localhost:4010, after the seed (the seed's drop removes indexes built at boot)
```

## Deployment

`npm run build && npm start` serves the app; build with the production `OPS_API_URL` (see Setup).

**Put the Ops app behind a reverse proxy that appends the client's address to `X-Forwarded-For`.** Don't expose
`next start` to clients directly. Vercel does this already; with nginx:

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Why: the `/api` rewrite adds no `X-Forwarded-For` of its own and passes on whatever the client sent. The server
runs with `trust proxy 1`, so it trusts one hop and takes the rightmost `X-Forwarded-For` entry as `req.ip`, and its
admin sign-in rate limit (5 tries per 15 minutes) is keyed on `req.ip`. Without that proxy, every Ops user shares
one rate-limit bucket (the Ops server's address), and a client can send its own `X-Forwarded-For` to get a fresh
bucket on every try, defeating the brute-force protection.

## Layout

- `src/lib/api.ts`: the only place that calls the server (`api`, `apiBlob`, `login`).
- `src/lib/types.ts`: request and response shapes, mirroring the server's views.
- `src/lib/session.ts`, `src/lib/format.ts`: the session store and IST/number formatting.
- `src/components/ui/`: the design kit (tokens live once, in `src/app/globals.css`).
- `src/components/AppShell.tsx`: header band, nav and the signed-in guard. Every page but `/login` renders inside it.
