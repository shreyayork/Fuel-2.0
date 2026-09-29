-- Playbook execution modes.
--
-- `mode='chat'` (default) keeps the existing behavior: the playbook runs
-- through the agent drawer, the agent drives, output is a `playbook_run`
-- artifact. `mode='guided'` is the new full-screen wizard path used for
-- structured data collection (KPI Benchmark + function assessments).
-- The guided wizard is the only entry point that can mint user-verified
-- `portfolio_updates(status='submitted')` rows — the agent's
-- `upsertPortfolioUpdate` skill is force-demoted to `status='draft'`.
ALTER TABLE "playbooks" ADD COLUMN "mode" text NOT NULL DEFAULT 'chat';
ALTER TABLE "playbooks" ADD COLUMN "steps" jsonb;
