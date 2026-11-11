# Tazmify Ops

The Ops web app: venue offers, the Tazmify-funded budget, voucher lookup and Cancel & refund, the monthly
redemptions report, and the team's accounts. Next.js (App Router) + Tailwind, client-rendered; it talks to the Tazmify
server through a same-origin proxy.

## Setup

```sh
npm install
cp .env.example .env.local   # then point OPS_API_URL at the server
```

| Variable | Example | Meaning |
| --- | --- | --- |
| `OPS_API_URL` | `http://localhost:4010` | The Tazmify server's root URL (no `/v1`). The browser calls `/api/<path>` on this app, and a Next.js rewrite forwards it to `${OPS_API_URL}/<path>`; sign-in alone goes straight to `${OPS_API_URL}/moderation/login` (see Deployment). |

Production builds (`npm run build`) read `.env.production`, which is committed and points at `https://api.tazmify.com`. A
`.env.local` overrides it, so delete or change `.env.local` before building for production.

`OPS_API_URL` is read when `next.config.ts` loads: by `npm run dev` at start-up, and by `npm run build` for
production. **The built app keeps the value it was built with**, so set it before `npm run build` (a build without it
warns and uses `http://localhost:4010`; a trailing slash is dropped) and rebuild to
change it. `npm start` does not re-read it.

## Run

```sh
npm run dev          # http://localhost:3000
npm run build && npm start
```

Sign in with an existing staff account (Admin, Operations or Intern); each level sees its own menu and lands on its own page. The session lives in `sessionStorage`:
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
their data. `e2e/stack/server.env.e2e` is the server's env for that stack (all secrets fake, and every external
service declared empty so a real `server/.env` can't switch one on), passed as process env,
never as `server/.env`; `e2e/stack/env.ts` parses it for Playwright. With `server/` next to `ops/`, from Git Bash:

```sh
cd ../server
set -a; . ../ops/e2e/stack/server.env.e2e; set +a
npm run --silent e2e:seed   # drops tazmify_e2e, seeds an admin per level, a venue, a creator, a ticket, a report, a campaign and a job; prints one line of JSON
npm run dev                 # http://localhost:4010, after the seed (the seed's drop removes indexes built at boot)
```

### End-to-end tests against the real server

```sh
npm run test:e2e    # stack:up, then playwright test --project=e2e
```

Two serial scenarios drive the pages in Chromium. `e2e/real/ops.spec.ts` (project `e2e-offers`) is the venue flow:
offers, vouchers, reports and Team. `e2e/real/admin.spec.ts` (project `e2e`, which depends on `e2e-offers`, so it runs
second) signs in one admin of each level (Admin, Operations, Intern) and covers what each can and can't do: Connects,
suspension, campaign close, tickets, push, settings. Creator, venue and brand steps call the server directly with the
seeded tokens. Each run:

1. seeds first (`e2e:seed` drops `tazmify_e2e`, clears the admin sign-in limiter's `rl:admin-login:*` keys in Redis,
   and seeds an admin per level, a venue, a creator, a ticket, a report, a campaign and a job; its JSON goes to the
   git-ignored `e2e/real/.seed.json`), then starts a fresh server on `127.0.0.1:4010` with `e2e/stack/server.env.e2e`;
2. builds the app with `OPS_API_URL=http://127.0.0.1:4010` and serves it with `next start` on `127.0.0.1:3200`;
3. `e2e/real/global-setup.ts` checks the server's `/health` and hands the seed to the specs.

Notes:
- Run the `e2e` project on its own. Playwright's `webServer` is global to a run, so `--project=e2e` starts the real
  stack instead of the mocked project's `next dev`.
- Ports 4010 and 3200 must be free; the run never reuses a running server.
- The build writes `.next`. `next dev` keeps its output in `.next/dev`, so the mocked tests are unaffected, but
  run `npm run build` again before `npm start` against another server.
- Admin sign-in allows 5 failed tries per 15 minutes per IP and email, counted in Redis, so the count outlives the
  server; the seed clears it. Only the sign-ins a test is about go through the form; other pages reuse a session.
- `admin.spec.ts` ends by suspending the seeded creator, which signs its token out for good. Rerun the whole thing
  (it reseeds), not `ops.spec.ts` on its own after it.
- The stack stays up afterwards; `npm run stack:down` removes it.

## Deployment

The panel is a Netlify site (`netlify.toml`: `npm run build`, publish `.next`, Node 20, and the `@netlify/plugin-nextjs`
runtime declared explicitly). If a deploy shows Netlify's own "Page not found" on every path while `/BUILD_ID` loads,
the runtime didn't run: check the deploy log lists `@netlify/plugin-nextjs`, then "Clear cache and deploy site".

1. New site from this repo, base directory left empty (the app is at the repo's root). Set `OPS_API_URL=https://api.tazmify.com` in the site's environment
   (it is also committed in `.env.production`, which `npm run build` reads). It is baked in at build time, so change it
   and redeploy.
2. **Add the site's URL (the Netlify one, and any custom domain) to `CORS_ORIGINS` in the server's `.env` on the VPS**,
   comma separated, then restart the server. Each entry is a bare origin, `https://ops-tazmify.netlify.app`, with no
   path and no trailing slash: the server matches it exactly. Sign-in goes from the browser straight to
   `${OPS_API_URL}/moderation/login` and is refused without it. Every other call stays on `/api/*`, which Netlify
   forwards to `OPS_API_URL`.
3. Netlify deploy previews and branch deploys have origins of their own (`https://deploy-preview-12--<site>.netlify.app`).
   Sign-in on one is refused until that origin is in `CORS_ORIGINS` too, so add it while you test there and remove it
   after.

Why sign-in skips the `/api` rewrite: through a proxy the server sees the proxy's address, not the staff member's, so
the sign-in rate limit (5 failed tries per 15 minutes per email and IP) would be shared by everyone or evaded with a
forged `X-Forwarded-For`. Called directly, `req.ip` is the browser's own address. A blocked email and IP pair gets
"Too many attempts, try again in 15 minutes".

## Layout

- `src/lib/api.ts`: the only place that calls the server (`api`, `apiBlob`, `login`).
- `src/lib/types.ts`: request and response shapes, mirroring the server's views.
- `src/lib/session.ts`, `src/lib/format.ts`: the session store and IST/number formatting.
- `src/lib/roles.ts`: the menu (`SECTIONS`), which levels (Admin, Operations, Intern) see each section, and each
  level's landing page. The server's permission middleware is what actually enforces it.
- `src/components/ui/`: the design kit (tokens live once, in `src/app/globals.css`).
- `src/components/AppShell.tsx`: header band, nav, the signed-in guard and the level guard (a page outside the
  signed-in level's sections renders "This page isn't available for your level." instead, so its fetches never run).
  Every page but `/login` renders inside it.
