---
name: commit-review
description: >-
  Lets the user review and edit a proposed commit message before committing.
  Gerrit Change-Id is appended by the commit-msg hook. Use when the user
  invokes commit-review or is at the commit gate in dev-loop.
---

# Commit Review

Shared rules: [../dev-loop/conventions.md](../dev-loop/conventions.md)

## Invocation

```
/commit-review
```

Usually follows `commit-msg`. User may paste their own message instead.

## Workflow

1. Show review card:

   ```markdown
   ## Commit Review

   **Branch:** `{current-branch}`
   **Gerrit target:** `refs/for/{target}` (default `dev`)
   **Staged files:** (list from `git diff --staged --name-only`)

   ### Proposed message
   ```
   {message}
   ```

   ### Diff stat
   {output of `git diff --staged --stat`}

   > Change-Id will be added automatically by the Gerrit commit-msg hook.
   ```

2. **Stop.** Options: **Commit** / **Edit message** / **Stage more** / **Abort**

3. On **Edit message** — apply edits, show card again.

4. On **Commit** — only then:
   ```bash
   git commit -m "$(cat <<'EOF'
   {approved message}

   EOF
   )"
   ```
   Report SHA, final message (including `Change-Id` from `git log -1 --format=%B`), and summary.

5. For patch sets, offer **Amend** instead of new commit to keep the same Change-Id:
   ```bash
   git commit --amend -m "$(cat <<'EOF'
   {approved message}

   EOF
   )"
   ```

## Guards

- Never commit without explicit user approval at this gate.
- Never use `--no-verify` unless user explicitly requests (skipping hook drops Change-Id).
- Warn if staged files contain likely secrets (`.env`, credentials).
