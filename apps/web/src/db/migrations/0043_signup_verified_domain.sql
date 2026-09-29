-- Founder-signup verified-domain claim. New columns on `accounts`:
--   verified_domain     — the email domain (lowercased) Google verified at
--                         sign-in when the account was provisioned through
--                         /onboard. UNIQUE in v1: one claimant per company
--                         domain. Null on accounts created any other way
--                         (invites, internal seeds, PM-mode accounts).
--   verified_domain_at  — when that claim happened, for audit.
--
-- The UNIQUE constraint is what prevents two simultaneous claims from
-- racing; provisionCompanyAccount catches Postgres 23505 and surfaces a
-- DomainAlreadyClaimedError to the API.
ALTER TABLE "accounts" ADD COLUMN "verified_domain" text;
ALTER TABLE "accounts" ADD COLUMN "verified_domain_at" timestamp;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_verified_domain_unique" UNIQUE("verified_domain");
