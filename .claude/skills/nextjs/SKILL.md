---
name: nextjs
description: >
  Use when building or editing anything in apps/web: App Router pages/layouts,
  Server Actions, API route handlers, middleware, data-fetching, streaming
  responses, metadata, auth guards, or debugging Next.js-specific errors
  (missing async, caching surprises, runtime mismatches) in this repo.
  Covers Next.js 15.5 + React 19 App Router only — no Pages Router.
---

<!-- Pinned versions — re-verify against apps/web/package.json before acting -->
<!-- next: 15.5.15 | react: 19.0.0 | package manager: npm workspaces -->

## 1. Async request APIs — #1 mistake in Next 15

`searchParams`, `params`, `cookies()`, `headers()`, and `draftMode()` are all
**async** in Next 15. Forgetting `await` produces a silent wrong value or a
runtime error.

```ts
// ✅ apps/web/src/app/(app)/portfolio/page.tsx
export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;   // must await
  ...
}

// ✅ apps/web/src/app/(auth)/sign-in/page.tsx
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; mode?: string }>;
}) {
  const { error, next, mode } = await searchParams;
  ...
}

// ❌ const { scope } = searchParams;  — wrong type, breaks at runtime
```

Dynamic route `params` follow the same rule:
```ts
// ✅
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

---

## 2. `dynamic = "force-dynamic"` — required for auth pages

Every page/layout that reads session cookies must opt out of static rendering.
All `(app)/*` pages and `(auth)/*` pages do this:

```ts
export const dynamic = "force-dynamic";
```

Omitting it on a page that calls `getSession()` will cause cookies to be read
at build time → stale/empty session in production.

---

## 3. Server Components by default — `'use client'` only when needed

Pages and layouts are Server Components (no directive). Mark `'use client'` only
for interactivity or browser APIs. The pattern here: server page fetches data,
passes serializable props to a named client component.

```ts
// ✅ apps/web/src/app/(app)/pipeline/page.tsx (Server Component)
import { PipelineViewClient } from "@/components/views/PipelineViewClient";

export default async function PipelinePage() {
  const data = await fetchData();
  return <PipelineViewClient syncedPipelines={data} />;
}

// PipelineViewClient.tsx has 'use client' at the top — owns all interaction
```

Do NOT put `'use client'` on page.tsx files that do DB calls.

---

## 4. Server Actions

Server Actions live in dedicated `actions.ts` files with `"use server"` at the
**top of the file** (not per-function). Always:
- Validate with Zod before trusting any input
- Call `revalidatePath()` after mutations
- Use `redirect()` for post-action navigation

```ts
// ✅ apps/web/src/app/(app)/portfolio/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

export async function createWatchlistAction(formData: FormData) {
  const email = await requireEmail();          // 1. auth guard
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;                           // 2. validate
  const wl = await createWatchlist({ name, ... });
  revalidatePath("/portfolio");                // 3. bust cache
  redirect(`/portfolio/${wl.id}`);             // 4. navigate
}
```

For non-FormData actions, validate with Zod first:
```ts
// apps/web/src/app/(auth)/sign-in/actions.ts
const SignInInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});
export async function signInAction(input: unknown): Promise<SignInResult> {
  const parsed = SignInInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };
  ...
}
```

---

## 5. Data fetching & caching

`fetch` is **NOT cached by default** in Next 15. Route handlers (GET) are also
not cached by default. Opt in explicitly when you want it:

```ts
// Static data (force-cache)
const data = await fetch(url, { cache: "force-cache" });

// ISR — revalidate every N seconds
const data = await fetch(url, { next: { revalidate: 3600 } });

// Tagged invalidation
const data = await fetch(url, { next: { tags: ["companies"] } });
// Later in a Server Action:
import { revalidateTag } from "next/cache";
revalidateTag("companies");
```

This codebase fetches all data directly via Drizzle (`getDb()`) inside async
server components/actions — not via `fetch`. No fetch caching is used today;
`revalidatePath` is the invalidation mechanism.

For parallel DB reads, always use `Promise.all`:
```ts
// ✅ apps/web/src/app/(app)/layout.tsx
const [currentUser, accountList] = await Promise.all([
  getCurrentUser(),
  listAccountsForUser(email),
]);
```

---

## 6. API Route Handlers

Route handlers live at `src/app/api/**/route.ts`. Key conventions:

```ts
// Required for routes using Node.js APIs (AWS SDKs, pg, fs, etc.)
export const runtime = "nodejs";

// Required for routes that shouldn't be cached
export const dynamic = "force-dynamic";

// For long-running routes (agent/streaming)
export const maxDuration = 300;   // seconds; 90 for onboarding, 300 for agent runs
```

For streaming NDJSON responses (agent runs, onboarding profile):
```ts
// ✅ apps/web/src/app/api/agent/runs/route.ts
import { buildNdjsonStream, NDJSON_HEADERS } from "@/lib/streaming/ndjson";

export async function POST(req: Request) {
  const generator = runAgentStream({ ... });
  return new Response(buildNdjsonStream(generator), { headers: NDJSON_HEADERS });
}
```

Use `"server-only"` import at the top of any route file that must never be
bundled into the client:
```ts
import "server-only";  // apps/web/src/app/api/onboard/profile/route.ts
```

---

## 7. Auth guard pattern

Auth is Cognito-based. The check is `COGNITO_USER_POOL_ID` env var — when
missing (local dev without Cognito), auth is skipped.

```ts
// In layouts / pages:
const session = await getSession();           // src/lib/auth/session.ts
if (requireAuth && !session) redirect("/sign-in");
const email = session?.email ?? "mike@york.ie";  // local dev fallback

// In Server Actions:
async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}
```

Multi-tenancy: always scope DB queries to `accountId`:
```ts
const account = await getActiveAccountForUser(email);  // src/lib/accounts.ts
if (!account) redirect("/sign-in");
// then use account.id in ALL queries
```

---

## 8. Middleware

`src/middleware.ts` handles **only** proactive Cognito token refresh. It does
NOT redirect unauthenticated users — that's the layout's job. Do not add route
protection to middleware; keep auth logic in layouts/Server Actions.

The matcher excludes: `api/auth`, `api/mcp`, `api/cron`, `_next/*`, `sign-in`,
and static root files. Add new public/bearer-auth routes to the matcher's
exclusion list if they don't use cookie auth.

---

## 9. File conventions & route groups

```
src/app/
  layout.tsx               ← root layout (metadata, fonts, Suspense)
  (app)/                   ← route group: authenticated PM + CM workspace
    layout.tsx             ← auth guard, AppShell wrapper, sidebar counts
    pipeline/page.tsx
    portfolio/
      page.tsx
      actions.ts           ← Server Actions for this route
  (auth)/sign-in/
    page.tsx
    actions.ts
  (public)/                ← unauthenticated marketing/public pages
  (super-admin)/           ← admin-only group
  api/                     ← route handlers only, no pages
    agent/runs/route.ts
    mcp/route.ts
```

Route groups `(name)` affect layout nesting but not the URL.

---

## 10. Metadata API

Use `export const metadata` or `generateMetadata`, never `<head>` hacks:

```ts
// Static — apps/web/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "Fuel 2.0 — York IE",
  icons: { icon: [{ url: "/favicon.ico" }] },
};
export const viewport: Viewport = { themeColor: "#284256" };

// Dynamic
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchItem(id);
  return { title: item.name };
}
```

---

## 11. Environment variables

Server-only vars (no prefix): `DATABASE_URL`, `COGNITO_*`, `APP_URL`, `STAGE`,
`DB_SECRET_ARN`, `DB_PROXY_ENDPOINT`, `AWS_REGION`.

Client-accessible vars need `NEXT_PUBLIC_` prefix. This codebase currently uses
no `NEXT_PUBLIC_` vars — all env access is server-side only.

Guard access to server vars:
```ts
import "server-only";          // build-time error if imported in a client bundle
const pool = process.env.COGNITO_USER_POOL_ID;  // always access at runtime, not module scope
```

---

## 12. DB client

Always use `getDb()` from `@/db/client` — it caches the Pool on `globalThis`
across HMR reloads and resolves credentials from Secrets Manager in Lambda:

```ts
import { getDb } from "@/db/client";
const db = await getDb();
const rows = await db.select().from(schema.accounts).where(...);
```

Never instantiate `new Pool()` directly in route handlers or components.

---

## 13. Import alias

`@/` maps to `src/` (tsconfig `baseUrl: "./src"`, `paths: { "@/*": ["./*"] }`):

```ts
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { AppShell } from "@/components/AppShell";
```

---

## 14. Styling conventions

- **Inline styles** for all ported design-prototype components (York Navy `#284256`,
  Teal `#00B48A`, Gold `#ECD67F`, fonts Inter + JetBrains Mono). Do not convert
  these to Tailwind without a deliberate pass.
- **Tailwind CSS 4** for new surfaces. Config via `@tailwindcss/postcss` in
  PostCSS — no `tailwind.config.js` file needed in v4.
- Never mix inline-style atoms with Tailwind classes in the same component.

---

## 15. Commands (run from repo root)

```bash
npm run dev              # start DB + Next dev server
npm run typecheck        # tsc --noEmit (run before committing)
npm run lint             # next lint
npm run db:migrate       # apply pending migrations
npm run db:generate -- --name <name>   # generate new migration
npm run db:reset         # drop + migrate + seed (destructive)
```
