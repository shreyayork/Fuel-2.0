# Next.js (apps/web)

Aligned with `CLAUDE.md` + App Router evolution.

## Server vs client

- Default: **Server Components** (`export const dynamic = "force-dynamic"` common for session/cookie routes)
- `"use client"` for hooks, forms, streaming fetch, theme context, drawers
- `(app)/layout.tsx` → `AppShell` (client) wraps authenticated routes
- `/onboard` has its own layout — **no AppShell** (user may have zero accounts)

## Data fetching

- Server: `loadDataset()`, Drizzle via `lib/*`, `getSession()` in layouts/pages
- Client: `fetch` to `app/api/*`, NDJSON streams (`lib/streaming/ndjson.ts` + onboard profile)
- Keep API logic in `route.ts` or `lib/`, not in view components
- Agent skills may call `loadDataset()` server-side

## Routing

```
app/
  (app)/          # AppShell — requires account (redirects to /onboard)
  (auth)/         # sign-in
  (public)/       # unauthenticated public pages
  (super-admin)/  # admin console
  onboard/        # founder onboarding
  api/            # route handlers
```

## Performance

- Avoid unnecessary client bundles and hydration
- Lazy-load heavy client-only modules when needed
- Use `next/image` for optimized images on new pages

## Legacy note

`/dashboard` still renders `<FuelApp data={loadDataset()}>` for bookmark compatibility; prefer `(app)/` routes for new work.
