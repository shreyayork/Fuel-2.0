-- Account-wide setting: when true, the sidebar surfaces Pipeline + Portfolio
-- features. When false (default), those nav items + routes are hidden so
-- accounts that don't manage portfolios get a leaner UI.
ALTER TABLE "accounts" ADD COLUMN "portfolio_manager_enabled" boolean DEFAULT false NOT NULL;
