---
name: push-to-gerrit
description: >-
  Pushes commits to Gerrit for code review (refs/for), drafts the change
  description from the diff and Jira ticket, and gets user approval before
  pushing. Never pushes to GitHub origin. Use when the user invokes
  push-to-gerrit or reaches the Gerrit push step in dev-loop.
---

# Push to Gerrit

Shared rules: [../dev-loop/conventions.md](../dev-loop/conventions.md)

## Invocation

```
/push-to-gerrit F20A-77
```

Optional: `target=dev` (default) or `target=main` for `refs/for/<target>`.

## Workflow

### 1. Preconditions

- On a feature branch (not `dev` unless intentional).
- At least one commit ahead of the merge base.
- Jira key available (arg or infer from branch name).
- Commits include `Change-Id` footer (added by Gerrit `commit-msg` hook).

Verify Change-Id on latest commit:

```bash
git log -1 --format=%B | grep '^Change-Id:'
```

If missing, amend to trigger the hook: `git commit --amend --no-edit`

### 2. Load Gerrit SSH key

Before fetch or push, run once per shell session:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/gerrit_ssh_key
```

### 3. Draft change description

Fetch Jira ticket if not already in context. Compare against target branch:

```bash
git fetch gerrit {target}
git log gerrit/{target}..HEAD --oneline
git diff gerrit/{target}...HEAD --stat
```

Draft using the Gerrit change description template from conventions. The **commit message body** should carry this content — if the draft differs from the latest commit, propose `git commit --amend` before push.

Suggest subject: `{type}({scope}): {summary} ({KEY})`

### 4. Gate — user approval

**Stop.** Options: **Push to Gerrit** / **Edit description** / **Abort**

### 5. Push to Gerrit (never `origin`)

Ensure the Gerrit SSH key is loaded (step 2). Re-run `eval` / `ssh-add` if the session is new or push fails with access rights errors.

```bash
git push gerrit HEAD:refs/for/{target}
```

Example: `git push gerrit HEAD:refs/for/dev`

Capture Gerrit output — it prints the change URL (e.g. `https://gerrit.yorkdevs.link/c/fuel-2.0/+/{number}`).

### 6. Report

- Gerrit change URL and number
- Target branch (`refs/for/{target}`)
- Change-Id from commit message
- Reminder: GitHub updates after **submit** in Gerrit, not on push

### 7. Optional

- Add Jira remote link via Atlassian MCP `addCommentToJiraIssue` with the Gerrit URL
- Suggest reviewers in Gerrit UI (do not use `gh pr edit`)

## Patch sets (fix cycle)

After amending or adding commits, load the SSH key if needed, then push again to the **same** Change-Id:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/gerrit_ssh_key
git push gerrit HEAD:refs/for/{target}
```

## Guards

- **Never** `git push origin` or `gh pr create` from this skill.
- Do not push until user approves the draft.
- Do not force-push to shared branches on `gerrit`.
