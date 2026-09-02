# Fuel Credit System — Production Spec

Reference for implementation and Jira story breakdown. **Demo behavior is layered on top** (see `src/app/credits/demoFlow.ts`) and does not change these costs or rules.

## Credit costs per action

| Action | Key | Credits |
|--------|-----|---------|
| Document upload + signal | `docUpload` | 15 |
| AI chat message | `aiChat` | 3 |
| Generate source (manual context) | `generateSource` | 8 |
| Playbook run | `playbookRun` | 40 |
| Crunchbase enrichment | `crunchbaseEnrichment` | 5 |

Source of truth in code: `src/app/credits/constants.ts` → `CREDIT_COSTS`.

## Plan limits

| Plan | Monthly pool | Daily soft cap | Block duration when daily cap hit |
|------|--------------|----------------|-----------------------------------|
| Free | 250 | 50 credits/day | 24 hours |
| Pro | 4,000 | 400 credits/day | 6 hours |

Source of truth: `PLAN_LIMITS` in `constants.ts`.

## Deduction order

1. Deduct from top-up balance first (if any).
2. Then deduct from monthly pool (`monthlyUsed` increases).
3. Increment `dailyUsed` by full action cost.
4. If `dailyUsed >= dailyLimit`, set `blockUntil = now + blockMs`.

## Block / unblock rules

**Generation is blocked when:**

- Monthly pool is empty (`monthlyUsed >= monthlyLimit + topUpBalance`), OR
- `blockUntil` is in the future (daily cap cooldown).

**On daily cooldown expiry (production):**

- Reset `dailyUsed` to 0, clear `blockUntil`, set `justUnblocked` toast state.

**Monthly pool** resets on calendar month boundary (label e.g. “Apr 1”) — not simulated in demo.

## UI surfaces

| Surface | When |
|---------|------|
| Sidebar credit indicator | Always (free/pro) |
| Credit popover | Click indicator; auto-open when blocked action attempted |
| Block banner | Daily cooldown active |
| Upgrade modal | Pro upgrade or top-up from popover |
| Credit toast | Low balance warning, post-upgrade, post-top-up |

## Top-up packs (production)

| Pack | Credits | Price |
|------|---------|-------|
| Starter | 300 | $3 |
| Builder | 800 | $7 |
| Scale | 2,000 | $15 |

## Demo overlay (current branch only)

Not production behavior — for live demo prep:

| Phase | Allowance | Block | Copy |
|-------|-----------|-------|------|
| Free start | ~2 doc uploads or ~3 context adds (30 daily credits) | 24h wait or upgrade | “Upgrade to Pro” / “Wait 24 hours” |
| After Pro upgrade | ~3 doc uploads (45 daily credits) | 6h wait or top-up | “Top up” / wait countdown |

Demo uses real `CREDIT_COSTS` and shortened wait timers when `DEMO_ACCELERATED_WAITS` is true.

See `src/app/credits/demoFlow.ts`.

## Jira story seeds

1. **Credit ledger API** — persist `monthlyUsed`, `dailyUsed`, `topUpBalance`, `blockUntil` per workspace.
2. **Action middleware** — `canAfford` / `applyDeduction` before doc upload, AI chat, source generation, playbooks, enrichment.
3. **Monthly reset job** — cron to zero `monthlyUsed` on billing cycle.
4. **Daily unblock job** — clear `blockUntil` + `dailyUsed` when cooldown ends (or event-driven).
5. **Stripe** — Pro subscription + top-up checkout; webhook updates plan and top-up balance.
6. **Popover / modal copy** — branch on `popoverState` and plan (free vs pro).
7. **Analytics** — fire events on block, upgrade click, top-up, unblock.
