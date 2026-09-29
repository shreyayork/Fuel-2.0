# F20A-126 — Onboarding Watchlist Migration (Fuel 1.0 → 2.0)

> **Ticket:** [F20A-126](https://yorkdocs.atlassian.net/browse/F20A-126) — Create a migration plan during onboarding.  
> **Audience:** Engineers implementing, testing, or extending Fuel 1.0 watchlist import.  
> **Keep this doc current** when lookup rules, Lambda event shape, or onboarding claim wiring change.

---

## 1. Purpose

When a Fuel 1.0 client logs into Fuel 2.0 and finishes onboarding by clicking **Continue** (benchmark step) or **Set up later**, Fuel should:

1. Match their email against Fuel 1.0 DynamoDB `Account.creator`.
2. Fetch all watchlists for those Fuel 1.0 account IDs.
3. Upsert them into Fuel 2.0 Postgres under the **newly claimed** account.
4. Tell the user during the claim overlay that lists are being fetched from Fuel 1.0.

The full Dynamo lookup + Postgres write runs **in the background**. Onboarding must not wait.

---

## 2. Locked product decisions

| ID | Topic | Decision |
|---|---|---|
| G1 | Who qualifies | **Creator only** — `Account.creator` equals session email (case-normalized). No `AccountMember` lookup, no `Watchlist.owner`-only union. |
| G2 | Overlay copy | **Always show** on Continue / Set up later claim overlay: “We're automatically fetching your watchlists from Fuel 1.0…” |
| G3 | After redirect | **Silent** — no banner/toast; lists appear when the job finishes. |
| G4 | Stuck `pending` | Expire after **30 minutes**, treat as failed, allow retry. Store `{ status, updatedAt }` in `user_preferences`. |

### Out of scope

- Full Account / Team org migration (separate `account-migration` Lambda).
- Fuel 1.0 Watchlist `scope` label (e.g. `"Competitors"`) and watchlist-level nested `company` map.
- Users who already have a Fuel 2.0 membership (`already_has_account`) — they never complete claim. Bulk watchlist-migration Lambda covers them.

---

## 3. End-to-end flow

```
User: Continue or Set up later
  → finishOnboarding → POST /api/onboard/claim
  → provisionCompanyAccount (new acct_…)
  → enqueue overview job
  → startLegacyWatchlistMigration({ creatorEmail, targetAccountId })  [async Lambda Event]
  → return redirect immediately  { legacyWatchlists: { started: true } }

Background Lambda:
  Account where creator = email
    → Watchlist where accountID ∈ those ids (dedupe by watchlist id)
    → WatchlistUser / WatchlistTeam / WatchlistSetting per id
    → upsert into Fuel 2.0 Postgres under targetAccountId
```

Both CTAs share one path. `exploreLater` calls `finishOnboarding` with `ctaOverride: "explore"`.

---

## 4. Fuel 1.0 lookup (locked)

DynamoDB region: **us-east-2**. Table suffix from `LEGACY_SUFFIX` (stage vs prod). Prod example: `rht7ttva25efbpq65ggzd4tfwi-prod`.

| Table | Role |
|---|---|
| `Account-{suffix}` | Lookup only: `creator` → `id` |
| `Watchlist-{suffix}` | Core payload, filtered by `accountID` |
| `WatchlistUser-{suffix}` | Shares (`watchlistUserListId`) |
| `WatchlistTeam-{suffix}` | Team access (`watchlistID` / `teamID`) |
| `WatchlistSetting-{suffix}` | Follow / star |

1. Scan `Account-*`, match `creator` case-insensitively to session email, collect `id`s.
2. Scan `Watchlist-*` with `accountID = :id` for each account; **dedupe by watchlist `id`**.
3. Per watchlist, Query GSIs:
   - `WatchlistUser` `gsi-WatchlistShares` / `watchlistUserListId`
   - `WatchlistTeam` `byWatchlist` / `watchlistID`
   - `WatchlistSetting` `gsi-WatchlistSettings` / `watchlistSettingWatchlistId`

If no Account / no watchlists → background no-op (not an error).  
If multiple Accounts share the same `creator` → migrate watchlists for **all** matching IDs.

---

## 5. What we migrate vs ignore

### Account-* (lookup only)

| Field | Use |
|---|---|
| `id` | Yes — Watchlist `accountID` key |
| `creator` | Yes — match session email |
| name, status, type, owners, members, plan, trial, seats, timestamps | **No** (this ticket) |

### Watchlist-*

| Field | Fuel 2.0 |
|---|---|
| `id` | `watchlists.id` **and** `legacy_id` (same UUID; no new IDs) |
| `accountID` | Select rows. Destination `account_id` = claim `targetAccountId` |
| `name` | `name` (fallback `"(unnamed)"`) |
| `account_privacy` | `PRIVATE` → `scope = "private"`; else `"account"` |
| `owner` | `owner_email` |
| `createdAt` / `updatedAt` | timestamps |
| `admins[]` | `watchlist_shares` role `admin` |
| `viewers[]` | `watchlist_shares` role `viewer` |
| `items[]` (uuid strings, `{uuid,name}`, or nested `company`) | `watchlist_companies` — full membership |
| `metadata.preview[]` `{uuid, name}` | Merged into `watchlist_companies` (names + fallback if `items` empty) |
| `company` `{id, name}` (watchlist-level) | **No** |
| Fuel 1.0 `scope` (e.g. Competitors) | **No** — F2 `scope` is privacy only |
| `__typename` | **No** |

Defaults on insert: `kind = "watchlist"`, `cadence = "weekly"`.

### WatchlistUser-*

| Field | Fuel 2.0 |
|---|---|
| `watchlistUserListId` | Join = Watchlist `id` |
| `owner` | Email → `watchlist_shares` role `viewer` if not already admin/viewer |

### WatchlistTeam-*

| Field | Fuel 2.0 |
|---|---|
| `watchlistID` / `teamID` | `watchlist_teams` **only if** `teamID` exists in F2 `teams`; else skip |

### WatchlistSetting-*

| Field | Fuel 2.0 |
|---|---|
| `watchlistSettingWatchlistId` / `owner` | Join + `watchlist_followers.user_email` |
| `follow` | true → `cadence = "weekly"`; starred-only → `"off"` |
| `starred` | `watchlist_followers.starred` |
| `email`, `funding_updates` | **No** |
| Skip row if follow and starred both false/absent | Yes |

---

## 6. Fuel 2.0 destination schema

Tables in `apps/web/src/db/schema.ts`:

- **`watchlists`**: required `id`, `name`, `scope`, `cadence`, `owner_email`; set `account_id`, `legacy_id`, timestamps.
- **`watchlist_companies`**, **`watchlist_shares`**, **`watchlist_followers`**, **`watchlist_teams`**.

---

## 7. Idempotency (no duplicate rows)

1. **Per-user gate** in `user_preferences` key `legacy_watchlists_migration`:
   - Value JSON: `{ "status": "pending" | "done" | "failed", "updatedAt": ISO }`.
   - Start only if missing, `failed`, or `pending` older than 30 minutes.
   - Set `pending` before work; `done` on success; `failed` if zero migrated and errors (or thrown).
   - Constant in Lambda: `PREF_LEGACY_WATCHLISTS_MIGRATION`. Also exported from `apps/web/src/lib/user-preferences.ts`.
2. **Row upserts:** `ON CONFLICT (id) DO UPDATE` on `watchlists`; children **delete-then-insert** (or `ON CONFLICT DO NOTHING`) per `watchlist_id`.
3. Never generate a new UUID for a migrated list.
4. Pass claim `accountId` as `targetAccountId` so all rows attach to one F2 account.

Lambda event `force: true` skips the gate (manual test sync only).

---

## 8. Implementation map

| Piece | Path |
|---|---|
| Claim hook | `apps/web/src/app/api/onboard/claim/route.ts` — after provision, `startLegacyWatchlistMigration`, do not await |
| Web Lambda client | `apps/web/src/lib/onboard/legacy-watchlist-migration.ts` |
| Claim overlay copy | `apps/web/src/components/onboard/chat/OnboardingClaimStatus.tsx` |
| Migration Lambda | `packages/infrastructure/lambda/watchlist-migration/index.ts` |
| Lambda CDK | `packages/infrastructure/lib/watchlist-migration.ts` — Dynamo read on Account + Watchlist* |
| Wire env + IAM | `packages/infrastructure/lib/fuel2-stack.ts` — `WATCHLIST_MIGRATION_FN_NAME`, `grantInvoke` |
| Env placeholder | `apps/web/.env.example` |
| TEMP Profile test UI | `ProfileView` + `syncLegacyWatchlistsAction` in `apps/web/src/app/(app)/account/profile/actions.ts` |

### Lambda event (onboarding)

```json
{
  "creatorEmail": "user@company.com",
  "targetAccountId": "acct_…",
  "force": false
}
```

Bulk path still supports `ownerEmails` / full scan (unchanged).

### Claim response (extra)

```json
{ "legacyWatchlists": { "started": true } }
```

Failures of invoke/migrate **must not** fail claim or redirect. Capture with Sentry tag `integration: watchlist_migration`. Empty Fuel 1.0 results are not errors.

---

## 9. Local vs deployed

| Environment | Behavior |
|---|---|
| Local `npm run dev` without `WATCHLIST_MIGRATION_FN_NAME` | Soft **no-op**. Overlay still shows the Fuel 1.0 step. Manual sync button reports “Not available locally”. |
| Deployed (CDK) | Web Lambda env set; async Event invoke after claim. Writes to **that stage’s RDS**, not Docker Postgres. |
| Manual Profile sync | `RequestResponse` invoke with `force: true`. Needs Lambda name + AWS credentials that can invoke it. Still writes to stage/prod DB. |

Stage function name (example from `packages/infrastructure/outputs-stage.json`):  
`fuel2-stage-WatchlistMigrationFn68D92C0A-vgALJu0S5WmI`

**Email mismatch:** lookup is creator-only. Login `maheshchomal+86@york.ie` will not find Fuel 1.0 Account `creator: maheshchomal@york.ie`. Use the Profile test field to pass the real creator email (lists still land on the signed-in F2 account).

---

## 10. Temporary test UI (remove after verification)

On **Account settings → My Profile → Your watchlists**:

- Field: **Fuel 1.0 creator email** (defaults to signed-in email).
- Button: **Sync watchlists from Fuel 1.0**.
- Result line under the button.

Marked TEMP in `ProfileView.tsx`. Delete the button, `syncLegacyWatchlistsAction`, and optionally `runLegacyWatchlistMigrationSync` / Lambda `force` if unused.

---

## 11. Sentry

- Unexpected invoke/runtime failures: `captureIntegrationException` with `integration: "watchlist_migration"`, operations `async_invoke` / `sync_invoke`.
- Do not capture empty legacy results or expected 4xx on claim.
- Do not attach tokens or Dynamo/Postgres secrets.

---

## 12. Fuel 1.0 sample shapes (reference)

Account (lookup): `id`, `creator`, plus unused billing/membership fields.

Watchlist: `id`, `accountID`, `account_privacy`, `admins`, `viewers`, `owner`, `name`, `createdAt`, `updatedAt`, `items[]` (full company list), `metadata.preview` (UI subset), unused watchlist-level `company` / label `scope`.

WatchlistSetting: `owner`, `follow`, `watchlistSettingWatchlistId` (optional `starred`).

WatchlistTeam: `teamID`, `watchlistID`.

WatchlistUser: `owner`, `watchlistUserListId`.
