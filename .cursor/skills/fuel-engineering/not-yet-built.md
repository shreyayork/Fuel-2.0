# Things that don't exist yet (from CLAUDE.md)

Before implementing these, read `techstack.md` for target choices.

| Item | Status |
|------|--------|
| `apps/agents` | Google ADK + Go service — not scaffolded |
| Playwright e2e | Dev dep + script only (`npm run test:e2e --workspace=apps/web`) |
| MCP token expiration/rotation | Tokens live until revoked |
| Users table | Cognito-resolved at request time only |

When asked to add any of the above, confirm scope against `techstack.md` and update `CLAUDE.md` if the gap is closed.
