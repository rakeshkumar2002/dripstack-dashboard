# DripStack — Dashboard

The Next.js 14 (App Router) control-room UI for
[DripStack](../dripstack-backend): the pipeline board, per-run timelines,
sequence builder, analytics, integrations, SSO and user management.

This repo contains **only the frontend**. The API and Temporal worker live in
**`dripstack-backend`** and are deployed to their own server. The two talk
cross-origin: the dashboard is a pure client-side SPA that calls an absolute API
URL and authenticates with a Bearer token from `localStorage` — there are no
cookies and no server-side proxy anywhere in the stack.

See [`CONTRACT.md`](CONTRACT.md) for everything that spans the two repos.

---

## Quick start

Needs Node 20+ and pnpm (`corepack enable pnpm`). Start the backend first — see
`dripstack-backend`'s README.

```bash
pnpm install
echo 'DASHBOARD_API_URL=http://localhost:4000' > .env.local
pnpm dev          # http://localhost:3000
```

The backend's default `DASHBOARD_URL=http://localhost:3000` already allows this
origin through CORS, so nothing extra is needed for local development.

```bash
pnpm typecheck    # tsc --noEmit
pnpm build
pnpm start
```

There is no `lint` script: the repo has no eslint config, and `next.config.mjs`
sets `eslint.ignoreDuringBuilds`. Adding one means adding `eslint-config-next`
and an `.eslintrc.json` first. Type errors *do* fail the build
(`typescript.ignoreBuildErrors: false`).

## Runtime configuration

`NEXT_PUBLIC_*` variables are substituted at **compile** time. Relying on one for
the API origin would bake a single environment into the bundle and make the
Docker image environment-specific — and because it is currently unset by default,
a naive build silently ships `http://localhost:4000` to every user's browser.

Instead, `app/layout.tsx` reads **`DASHBOARD_API_URL`** per request and emits it
as `window.__DRIPSTACK_CONFIG__` in an inline `<head>` script that runs before any
bundle hydrates. `app/lib/api.ts` exposes two accessors:

| Use | When |
|---|---|
| `apiBase()` | Inside fetches and click handlers — anything that runs in the browser after hydration. |
| `useApiBase()` | Anywhere the URL is **rendered into markup**. It renders the fallback on the server and first paint, then swaps in an effect, avoiding a hydration mismatch. |

The trade-off is `export const dynamic = 'force-dynamic'` in the root layout,
which costs static prerendering. That is free here — every page but
`app/page.tsx` (a bare redirect) is `'use client'` and fetches its own data.

`NEXT_PUBLIC_API_URL` remains as a build-time fallback only. In production the
container **refuses to start** if `DASHBOARD_API_URL` is unset, so a
misconfiguration is a crash rather than an app that quietly calls localhost.

## Docker

```bash
docker build -t dripstack-dashboard .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e DASHBOARD_API_URL=https://api.example.com \
  dripstack-dashboard
```

One image serves every environment. Two things to know:

- The build uses `output: 'standalone'`, and `.next/standalone` bundles **neither**
  `.next/static` **nor** `public/` — the Dockerfile copies both explicitly.
- `app/layout.tsx` uses `next/font/google`, so **`next build` fetches fonts from
  Google and the builder stage needs outbound network.** On an air-gapped builder,
  vendor the WOFF2 files and switch to `next/font/local`.

For a deploy behind TLS, `docker-compose.prod.yml` + `Caddyfile` run the app
`read_only` behind Caddy — possible precisely because config is injected rather
than written into the bundles at start.

## Docs site

`public/docs/` holds the static documentation site (architecture, configuration,
integrations, API, security, deployment), served at **`/docs`**. It is plain HTML
with no build step; `next.config.mjs` redirects the bare `/docs` to
`/docs/index.html` because Next does not resolve a directory index under
`public/`.

Note that roughly half of it documents the **backend** but is edited from this
repo — a deliberate trade so the docs are actually served somewhere.

## Notes

Backend response types are **hand-mirrored** here (e.g. `Principal` in
`app/lib/principal.ts`) rather than shared through a package. That keeps the
repos independent, at the cost of updating both when a response shape changes.
