---
name: ticket-to-impl
description: >-
  Reads a Jira ticket, drafts an implementation plan, gets user approval,
  implements the change, and verifies the result against requirements.
  Use when the user invokes ticket-to-impl or needs plan-then-code for a ticket.
---

# Ticket to Implementation

Shared rules: [../dev-loop/conventions.md](../dev-loop/conventions.md)

## Invocation

```
/ticket-to-impl F20A-77
```

Modes: `plan-only` (stop after plan approval) or full (default).

## Phase A — Understand

1. Fetch Jira ticket (Atlassian MCP). Include comments when present.
2. Optional: `getTeamworkGraphContext` for linked docs, epics, prior PRs.
3. Explore codebase — search before creating; read `CLAUDE.md` + `fuel-engineering` skill for Fuel work.
4. List **open questions** only if blocking; otherwise state assumptions.

## Phase B — Plan (gate: user approval)

Produce:

```markdown
## Implementation Plan — {KEY}

### Problem
{What the ticket asks for, in plain language}

### Acceptance criteria
- [ ] Criterion 1 (mapped from Jira)
- [ ] ...

### Approach
{Files to touch, patterns to reuse, data/auth implications}

### Out of scope
{Explicitly excluded}

### Risks / edge cases
{...}

### Verification
{How we will confirm each criterion — tests, manual steps, typecheck}
```

**Stop.** Ask: Approve / Edit plan / Abort. Do not write code until approved.

## Phase C — Implement

After plan approval:

1. Implement minimally — match repo conventions; smallest correct diff.
2. Run `npm run typecheck` and `npm run lint` on affected workspaces.
3. Sentry impact review when touching error paths or APIs.

## Phase D — Verify vs requirements (gate: user approval)

Produce **Requirements Check**:

```markdown
## Requirements Check — {KEY}

| Criterion | Status | Evidence |
|-----------|--------|----------|
| ... | met / partial / not met | file, test, or behavior |

### Gaps
{Any partial/not-met items and proposed follow-up}
```

**Stop.** Ask: Approve implementation / Request changes / Abort.

If changes requested, loop Phase C → D until approved or aborted.
