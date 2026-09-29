# Dev Loop — Shared Conventions

## Inputs

| Input | Required | Example |
|-------|----------|---------|
| Jira ticket key or URL | For ticket steps | `F20A-77` or `https://yorkie.atlassian.net/browse/F20A-77` |
| Skill name | When running a single step | `ticket-to-impl` |
| Repo | Optional | Defaults to current workspace checkout |

## Atlassian MCP (Jira)

Server name: **atlassian**

1. Resolve `cloudId` — pass the site hostname (e.g. `yorkie.atlassian.net`) or call `getAccessibleAtlassianResources`.
2. Fetch the issue with `getJiraIssue` (`responseContentFormat: "markdown"`, include `comment` in fields when discussion matters).
3. For linked changes, Confluence pages, or epic/parent context, call `getTeamworkGraphContext` with `objectType: "JiraWorkItem"` then `getTeamworkGraphObject` on key ARIs.

## Gerrit + GitHub remotes

This repo uses **Gerrit for review**; **GitHub (`origin`) is updated only after Gerrit submit** — do not push or open PRs on GitHub directly.

| Remote | URL | Dev-loop use |
|--------|-----|--------------|
| `gerrit` | `ssh://<user>@gerrit.yorkdevs.link:29418/fuel-2.0` | **Push target** — `refs/for/<target-branch>` |
| `origin` | `git@github.com:York-IE-Labs/fuel-2.0.git` | **Read-only** — fetch base branch, compare after submit |

Default target branch for `refs/for/`: **`dev`** (GitHub default branch). User may override (e.g. `main`).

Gerrit review UI: `https://gerrit.yorkdevs.link` (append `/c/fuel-2.0/+/<change-number>` for a change).

### Gerrit SSH key (required before push/fetch)

Before any `git push gerrit`, `git fetch gerrit`, or `ssh … gerrit.yorkdevs.link` command, load the Gerrit SSH key **once per shell session**:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/gerrit_ssh_key
```

If push or fetch fails with permission denied / access rights errors, re-run the commands above and retry.

### Push command (never use `origin` for push)

```bash
git push gerrit HEAD:refs/for/{target-branch}
```

Example: `git push gerrit HEAD:refs/for/dev`

### Change-Id

The repo's `.git/hooks/commit-msg` (Gerrit hook) **automatically appends `Change-Id`** on `git commit`. Do not hand-author Change-Ids in draft messages. Reuse the same Change-Id across patch sets by amending (`git commit --amend`).

### Submit (merge)

Submit happens **in Gerrit** (UI or CLI). That propagates the change to the GitHub branch. **Never** `gh pr merge` or `git push origin` from dev-loop.

Submit via SSH when user approves at the submit gate (load Gerrit SSH key first — see above):

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/gerrit_ssh_key
ssh -p 29418 {user}@gerrit.yorkdevs.link gerrit review --submit fuel-2.0~{target-branch}~{Change-Id}
```

Or direct the user to submit in the Gerrit UI.

## Branch naming

```
{type}/{ISSUE-KEY}-{kebab-summary}
```

| Jira issue type | Branch prefix |
|-----------------|---------------|
| Bug | `fix` |
| Story, Task, Improvement | `feat` |
| Chore, Tech debt, Spike | `chore` |
| Default / unknown | `feat` |

Summary: first ~5 words of the ticket summary, lowercased, hyphenated, alphanumeric only.

## Human approval gates

Never skip these unless the user explicitly says to auto-approve:

| Gate | When | User options |
|------|------|--------------|
| **Plan** | After plan draft, before implementation | Approve / Edit / Abort |
| **Implementation** | After code + self-check vs plan | Approve / Request changes / Abort |
| **Commit** | After suggested message, before `git commit` | Approve / Edit message / Abort |
| **Gerrit push** | After change description draft, before `git push gerrit` | Approve / Edit / Abort |
| **Submit** | Before Gerrit submit | Submit / Keep in review |

## Quality bar (Fuel 2.0)

After implementation, before commit:

- `npm run typecheck` and `npm run lint` on affected workspaces
- Read `CLAUDE.md` and `.cursor/skills/fuel-engineering/SKILL.md` when touching product code
- Sentry impact review per `.cursor/rules/sentry-monitoring.mdc`
- No commits unless the user explicitly approves at the commit gate

## Conventional Commits

```
<type>(<scope>): <imperative summary>

[optional body — why, not what]

Refs: F20A-77
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `ci`, `build`.

Scope: primary area (`onboard`, `auth`, `integrations`, `db`, etc.).

`Change-Id` is added by the Gerrit hook after commit — not in the draft.

## Gerrit change description

The **commit message** is the change description (first patch set). Structure:

```markdown
<type>(<scope>): <summary> (F20A-77)

## Summary
- Bullet tied to Jira acceptance criteria

## Test plan
- [ ] Concrete verification steps

Refs: F20A-77
```

## Gerrit review comment format

```markdown
**{severity}** — `{filepath}:{line}`

{issue}

{suggested fix or question}
```

Severity: `must-fix`, `suggestion`, `nit`. Paste into Gerrit file comments or reply thread.
