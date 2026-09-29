-- Company Manager mode (Phase 8): an account that ISN'T in portfolio-manager
-- mode maps to a single company the CM identifies as "their own." The
-- landing page redirects straight to that company profile instead of
-- bouncing through /portfolio or /watchlists, and CM-side features hang
-- off this pointer (future: investor pipeline modeled as initiatives).
--
-- Nullable + no default — an account opts in by setting it explicitly from
-- /account/settings. Portfolio-manager accounts leave it null.
ALTER TABLE "accounts"
  ADD COLUMN "primary_company_uuid" text;
