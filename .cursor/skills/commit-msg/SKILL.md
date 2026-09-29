---
name: commit-msg
description: >-
  Suggests a Conventional Commit message from the current git diff. Use when
  the user invokes commit-msg, asks for a commit message, or before committing
  in the dev loop. Change-Id is added automatically by the Gerrit hook.
---

# Commit Message

Shared rules: [../dev-loop/conventions.md](../dev-loop/conventions.md)

## Invocation

```
/commit-msg
```

Optional: reference Jira key for footer (`F20A-77`).

## Workflow

1. Inspect changes:
   ```bash
   git status
   git diff
   git diff --staged
   ```

2. If nothing staged, ask whether to stage all, stage specific paths, or abort.

3. Draft message (no `Change-Id` — the Gerrit `commit-msg` hook adds it on commit):
   ```
   <type>(<scope>): <imperative summary>

   <body — why this change, tie to ticket if known>

   Refs: F20A-77
   ```

4. Present **one primary suggestion** plus at most one alternative if type/scope is ambiguous.

5. Hand off to `commit-review` — do **not** run `git commit` in this step.

## Heuristics

- One logical change per commit; suggest splitting if diff mixes unrelated concerns.
- `fix` for bugs, `feat` for user-visible additions, `chore` for tooling/deps-only.
- Scope from primary directory (`apps/web/src/components/onboard` → `onboard`).
- For Gerrit patch sets, prefer `git commit --amend` to preserve Change-Id.
