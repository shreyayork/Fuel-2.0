---
name: dev-loop
description: >-
  Orchestrates the full dev loop from a Jira ticket — branch, plan, implement,
  verify, commit, push to Gerrit, review, fix cycles, submit. GitHub is updated
  only after Gerrit submit. Use when the user invokes dev-loop, says "run the
  dev loop", or provides a Jira ticket for end-to-end delivery.
---

# Dev Loop — Orchestrator

Runs the full workflow with human checkpoints at each gate.

```
Jira → Branch → Plan → Implement → Verify → Commit → Gerrit push → Review → Fix → Submit
                                                              ↓
                                                    GitHub (via Gerrit submit)
```

Shared rules: [conventions.md](conventions.md)

## Invocation

```
/dev-loop F20A-77
```

Or: "Run dev-loop on F20A-77" / "Full dev loop for ticket F20A-77".

Optional flags (user may state inline):

- `from=<step>` — resume at a step (`plan`, `implement`, `commit`, `gerrit`, `review`, `fix`)
- `skip-submit` — stop after change is pushed to Gerrit
- `target=main` — push to `refs/for/main` instead of `dev`
- `auto-approve` — skip gates (only when user explicitly requests)

## Orchestration checklist

Copy and track:

```
Dev Loop Progress:
- [ ] 1. Fetch Jira ticket
- [ ] 2. ticket-to-branch
- [ ] 3. ticket-to-impl (plan → user approval)
- [ ] 4. ticket-to-impl (implement → verify vs plan → user approval)
- [ ] 5. commit-msg + commit-review → commit
- [ ] 6. push-to-gerrit
- [ ] 7. change-review
- [ ] 8. Fix cycle (if needed) → amend/recommit → push-to-gerrit
- [ ] 9. Submit in Gerrit (if approved)
```

## Step 1 — Fetch Jira ticket

Follow [conventions.md](conventions.md) Atlassian section. Produce a **Ticket Brief**:

```markdown
## Ticket Brief — {KEY}
**Summary:** ...
**Type / Priority:** ...
**Acceptance criteria:** (from description + comments)
**Linked context:** (epic, changes, Confluence — from Teamwork Graph if useful)
**Suggested branch:** {type}/{KEY}-{kebab-summary}
**Gerrit target:** refs/for/dev (or user override)
```

Present the brief; confirm the ticket is correct before branching.

## Steps 2–9

Run each step using its standalone skill (read `SKILL.md` in that directory):

| Step | Skill |
|------|-------|
| Branch | [ticket-to-branch](../ticket-to-branch/SKILL.md) |
| Plan + implement | [ticket-to-impl](../ticket-to-impl/SKILL.md) |
| Commit message | [commit-msg](../commit-msg/SKILL.md) |
| Commit review | [commit-review](../commit-review/SKILL.md) |
| Push to Gerrit | [push-to-gerrit](../push-to-gerrit/SKILL.md) |
| Change review | [change-review](../change-review/SKILL.md) |

## Fix cycle

When `change-review` finds `must-fix` items or Gerrit CI fails:

1. Summarize findings for the user.
2. On approval, implement fixes (re-run relevant parts of `ticket-to-impl`).
3. Re-run typecheck/lint.
4. Amend or new commit via `commit-msg` → `commit-review` (preserve Change-Id on amend).
5. Push new patch set via `push-to-gerrit`.
6. Re-run `change-review` until clean or user stops.

## Submit

Only when user approves at the submit gate:

- Submit in Gerrit (UI or `gerrit review --submit` per conventions)
- Optionally transition Jira via Atlassian MCP `transitionJiraIssue`
- Post summary with Gerrit change URL; note GitHub will reflect after submit

**Never** push to `origin` or merge via GitHub from this workflow.

## Standalone steps

User can invoke any step alone: `ticket-to-branch`, `ticket-to-impl`, `commit-msg`, `commit-review`, `push-to-gerrit`, `change-review`.

When a standalone step needs ticket context, fetch Jira first (step 1).
