-- Instance-level advisors: account_id NULL = Super Admin curated,
-- visible to every account (mirrors playbooks.account_id).
ALTER TABLE "advisors" ALTER COLUMN "account_id" DROP NOT NULL;
