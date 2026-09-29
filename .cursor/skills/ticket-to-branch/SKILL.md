---
name: ticket-to-branch
description: >-
  Creates a Git branch from a Jira ticket key or URL. Fetches issue details
  via Atlassian MCP, derives branch name, checks out from the Gerrit base
  branch. Use when the user invokes ticket-to-branch or needs a branch for a
  Jira ticket.
---

# Ticket to Branch

Shared rules: [../dev-loop/conventions.md](../dev-loop/conventions.md)

## Invocation

```
/ticket-to-branch F20A-77
```

Optional: `target=dev` (default) or `target=main` — branch is created from `gerrit/{target}`.

## Workflow

1. **Fetch ticket** — Atlassian MCP `getJiraIssue` (markdown). Build Ticket Brief (summary, type, acceptance criteria).

2. **Derive branch name** — `{type}/{KEY}-{kebab-summary}` per conventions.

3. **Confirm with user** — show proposed branch name and Gerrit target branch. Wait for approval or edited name.

4. **Create branch** (base from Gerrit, not GitHub push)

   Load Gerrit SSH key before fetch (see conventions):
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/gerrit_ssh_key
   git fetch gerrit {target}
   git checkout -b {branch-name} gerrit/{target}
   ```

   If already on `{target}` locally and up to date:
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/gerrit_ssh_key
   git fetch gerrit {target}
   git checkout {target} && git merge gerrit/{target}
   git checkout -b {branch-name}
   ```

5. **Report** — branch name, base commit, ticket link, planned `refs/for/{target}`.

## Guards

- Abort if working tree has uncommitted changes the user did not acknowledge.
- If branch exists locally, ask: checkout existing / create new suffix / abort.
- Do not push — push happens in `push-to-gerrit`.
- Do not push to `origin`.
