-- Drop the UNIQUE constraint on `accounts.verified_domain`.
--
-- Rationale: cold sign-ups should always create a standalone workspace,
-- even when a colleague at the same domain already has one. Teammates
-- who want to share a workspace go through the invite flow (an
-- existing-account admin sends an invite via `invite_tokens`). The
-- column still records which domain Cognito verified at sign-in for
-- benchmark-contribution gating and auditing.
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_verified_domain_unique";
