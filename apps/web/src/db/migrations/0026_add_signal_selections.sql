-- Which signals an account cares about (account-level default), and which
-- a given watchlist/portfolio cares about (override). Resolver: watchlist
-- selections > account_selections > a hardcoded "core" global default.
CREATE TABLE "account_signal_selections" (
  "account_id" text NOT NULL,
  "signal_id" text NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "target" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("account_id", "signal_id")
);
ALTER TABLE "account_signal_selections"
  ADD CONSTRAINT "account_signal_selections_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
ALTER TABLE "account_signal_selections"
  ADD CONSTRAINT "account_signal_selections_signal_id_signals_id_fk"
  FOREIGN KEY ("signal_id") REFERENCES "signals"("id") ON DELETE CASCADE;

CREATE TABLE "watchlist_signal_selections" (
  "watchlist_id" text NOT NULL,
  "signal_id" text NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "target" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("watchlist_id", "signal_id")
);
ALTER TABLE "watchlist_signal_selections"
  ADD CONSTRAINT "watchlist_signal_selections_watchlist_id_watchlists_id_fk"
  FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE;
ALTER TABLE "watchlist_signal_selections"
  ADD CONSTRAINT "watchlist_signal_selections_signal_id_signals_id_fk"
  FOREIGN KEY ("signal_id") REFERENCES "signals"("id") ON DELETE CASCADE;
