# DripStack dashboard — agent guide

Read this before changing anything. It records the invariants, the conventions,
and the mistakes already made here.

## What this is

Next.js 14 App Router UI for DripStack, plus the **public documentation site**
served from `public/docs/`. Talks to the backend over HTTP; it has no database
and no server-side data fetching — every page is `'use client'` and fetches its
own data.

## Layout

| Path | Holds |
|---|---|
| `app/<route>/page.tsx` | One page each. All client components. |
| `app/lib/api.ts` | `api()` fetch wrapper, token storage, `useAuthProviders()` |
| `app/lib/principal.ts` | Current user + `can(permission)` |
| `components/Shell.tsx` | Sidebar, nav, the "absorbed today" card |
| `components/ui.tsx` | `C` design tokens, shared primitives |
| `public/docs/` | **Customer-facing** docs site (static HTML, own stylesheet) |

Routes: `/login` `/signup` `/runs` `/runs/[id]` `/sequences` `/analytics`
`/contacts` `/events` `/technicians` `/team` `/users` `/customers`
`/integrations` `/email` `/security` `/settings` `/sso` `/sso/callback`.

## Invariants — do not break these

**1 · The API origin is injected at runtime, never baked in.** `app/layout.tsx`
reads `DASHBOARD_API_URL` per request into `window.__DRIPSTACK_CONFIG__`; the
`NEXT_PUBLIC_API_URL` fallback exists only so the image is environment-agnostic.
Build once, deploy anywhere. Don't inline the origin at build time.

Use `apiBase()` in handlers, `useApiBase()` where the URL is *rendered* — the
latter avoids a hydration mismatch.

**2 · Nav entries must be reachable and permission-gated.** `Shell.tsx` filters
by `perm`. Three pages once existed with no link at all — including `/settings`,
which holds the event source ID, signing secret and API keys, i.e. everything a
developer needs to integrate. If you add a page, add its nav entry.

**3 · Never render a control the backend can't honour.** `/auth/providers` says
what's configured; the Google button and signup link render only when it does. A
button that 404s is worse than no button.

**4 · Optional UI reserves its space.** `useAuthProviders()` returns `undefined`
while loading and `null` on failure so callers can tell those apart from a real
answer. Render a skeleton of the same height, not nothing — `/signup` used to
return `null` for the entire round trip and showed a blank page.

**5 · Don't hardcode metrics.** The sidebar card claimed "23 of 28 incidents ·
82%" on every install, including empty ones. It now reads `today` from
`/api/v1/analytics`, and `absorbedRate` is `null` (not `0`) when nothing has
closed — "0% resolved" reads as failure where "none closed yet" is the truth.

**6 · The public docs contain no internals.** `public/docs/` is customer-facing:
no framework names, no architecture, no deployment. Engineering documentation
lives in the `dripstack-deploy` repo. HMAC is the one exception — a customer
can't sign a request without it.

## Conventions

- Tailwind for layout; **colours come from `C` in `components/ui.tsx`**, not
  arbitrary hex. `C` mirrors `globals.css`.
- `api<T>()` for every call — it handles the token, 401 redirect, and surfaces
  FastAPI's `{detail}` so the UI can say why.
- Errors tell the user what to do, not what broke.
- `pnpm typecheck` must pass; `next.config.mjs` sets
  `typescript.ignoreBuildErrors: false`, so a type error fails the build.
  ESLint *is* ignored during builds — don't rely on it catching anything.

## Running and testing

```bash
pnpm install
pnpm dev          # :3000, expects the API on :4000
pnpm typecheck    # the real gate
pnpm build        # standalone output
```

There is **no test suite** — `typecheck` plus the CI route-contract check is all
that guards this repo. Verify UI changes by loading the page.

The docs site is plain static HTML: edit `public/docs/*.html` and reload. Every
page carries its own copy of the sidebar and footer, so **a nav change means
editing them all** — and watch for `class="active"` on the current page breaking
a naive find-and-replace.

## Gotchas — real bugs, already paid for

| Symptom | Cause |
|---|---|
| Dashboard calls `localhost` in production | `DASHBOARD_API_URL` unset. The entrypoint hard-fails on this deliberately. |
| Page blank for a beat, then appears | Returning `null` while providers load. Reserve the space instead. |
| Nav change missed one page | That page's own link carries `class="active"`, so the pattern didn't match. |
| Docs page 404s after a rename | Each page hardcodes the sidebar; update all of them. |
| Build OOMs on the server | Never build on the deploy box — `pnpm build` needs more than its 2 GB. CI builds arm64 images. |
| Fonts silently fall back | `next/font/google` fetches at build time; the build stage needs network. |

## Deployment

Push to `main` → typecheck + build → arm64 image → ECR → SSM deploy, live in
~4 minutes. The docs site ships inside this image, so a docs edit is a normal
deploy. Infra lives in the `dripstack-deploy` repo.
