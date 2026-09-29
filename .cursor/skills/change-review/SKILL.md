---
name: change-review
description: >-
  Produces line-targeted review feedback for a Gerrit change, suitable for
  pasting as Gerrit comments. Use when the user invokes change-review, wants
  a self-review before submit, or is in the review step of dev-loop.
---

# Gerrit Change Review

Shared rules: [../dev-loop/conventions.md](../dev-loop/conventions.md)

## Invocation

```
/change-review
```

Optional: Gerrit change number or URL. Defaults to the change from the latest `push-to-gerrit` in session, or query by branch Change-Id. Default merge base: `gerrit/dev`.

## Workflow

### 1. Load change context

**Prefer local diff** (no GitHub / `gh`):

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/gerrit_ssh_key
git fetch gerrit dev
git log gerrit/dev..HEAD --oneline
git diff gerrit/dev...HEAD
```

Use `gerrit/main` (or another branch) only when the change targets that branch.

If change number is known, fetch patch set:

```bash
git fetch gerrit refs/changes/{nn}/{change-id}/{ps} && git show FETCH_HEAD
```

Or query via SSH (load Gerrit SSH key first — see conventions):

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/gerrit_ssh_key
ssh -p 29418 {user}@gerrit.yorkdevs.link gerrit query --current-patch-set change:{number}
```

Do **not** use `gh pr view` or GitHub MCP for review — changes live in Gerrit until submit.

### 2. Load requirements

- Jira key from commit message or branch name → fetch ticket via Atlassian MCP.
- Build checklist from acceptance criteria.

### 3. Review dimensions

| Area | Check |
|------|-------|
| Requirements | Each acceptance criterion addressed? |
| Correctness | Logic, edge cases, error handling |
| Security | Auth scope, secrets, injection |
| Conventions | Fuel theme tokens, TypeScript, account scoping |
| Tests | Adequate verification in test plan |
| Scope | Unrelated changes? |

For Fuel code, apply `fuel-engineering` and `sentry-monitoring` rules.

### 4. Output — paste-ready Gerrit comments

```markdown
## Gerrit Review — Change {number}: {subject}

### Verdict
{approve | request changes | comment}

### Requirements coverage
| Criterion | Status | Notes |
|-----------|--------|-------|

### Comments (paste into Gerrit)

---
**must-fix** — `path/to/file.ts:42`

{Description of issue}

{suggested fix}
---

**suggestion** — `path/to/file.ts:10`
...
```

### 5. Fix cycle handoff

If `must-fix` items exist, ask whether to enter fix cycle (`dev-loop` step 8) → amend → `push-to-gerrit`.

Post comments via Gerrit UI or SSH only when user explicitly asks (load Gerrit SSH key first — see conventions):

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/gerrit_ssh_key
ssh -p 29418 {user}@gerrit.yorkdevs.link gerrit review {change-id} --message "{comment}"
```

### 6. Submit readiness

If verdict is **approve**, remind user that **submit** happens in Gerrit (not GitHub). GitHub branch updates after submit.

## Guards

- Cite real line numbers from the diff.
- Distinguish must-fix vs nit — do not block on style nits alone.
- Do not submit from this skill unless user explicitly approves at the submit gate.
