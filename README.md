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
npm run test:unit    # Node-only specs in e2e/unit (no browser, no server)
npm run test:mocked  # browser specs in e2e/mocked against `next dev`, every /api call mocked
```

First time only: `npx playwright install chromium`.

The mocked project starts `next dev` on port 3100 with `OPS_API_URL=http://127.0.0.1:9` (nothing listens there),
and each spec answers `/api/*` with `mockApi()` from `e2e/mocked/helpers.ts`. A call a spec didn't mock fails the
test.

## Layout

- `src/lib/api.ts`: the only place that calls the server (`api`, `apiBlob`, `login`).
- `src/lib/types.ts`: request and response shapes, mirroring the server's views.
- `src/lib/session.ts`, `src/lib/format.ts`: the session store and IST/number formatting.
- `src/components/ui/`: the design kit (tokens live once, in `src/app/globals.css`).
- `src/components/AppShell.tsx`: header band, nav and the signed-in guard. Every page but `/login` renders inside it.
