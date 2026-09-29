-- Initiative instrumentation: pin a baseline snapshot and a target goal
-- per (initiative, signal) so the progress dashboard can render the
-- "baseline → current → target" story Adam asked for on the Apr 24 call.
--
-- Why separate rows per role instead of one row with both fields:
-- baselines and targets are captured at different times, by different
-- actors, and frequently only one exists — a manually-created initiative
-- might have a target but no baseline if we joined late, and a suggested
-- initiative carries a baseline from the motivating observation even when
-- the owner hasn't picked a target yet.
--
-- The (initiative_id, signal_id, role) composite PK enforces at most one
-- baseline + one target per signal per initiative. That's the product
-- invariant — "what were we at, what are we aiming for" — not a stats
-- joke.
CREATE TABLE "initiative_signals" (
  "initiative_id" text NOT NULL,
  "signal_id" text NOT NULL,
  -- 'baseline' | 'target'
  "role" text NOT NULL,
  -- Value snapshot. For baseline: the value at link time. For target: the
  -- goal. Only one of the three will be non-null based on the underlying
  -- signal's kind.
  "value_numeric" double precision,
  "value_text" text,
  "value_bool" boolean,
  -- For target rows only: when the owner expects to hit this number.
  -- Free-form ("2026-q3", "end of July 2026") to match the initiative's
  -- existing `due` field convention.
  "target_date" text,
  -- Pointer back to the observation that seeded a baseline — lets the
  -- dashboard link "baseline 🔗 source" to the exact email / note where
  -- the number came from.
  "source_observation_id" text,
  "created_by_email" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("initiative_id", "signal_id", "role")
);

ALTER TABLE "initiative_signals"
  ADD CONSTRAINT "initiative_signals_initiative_id_fk"
  FOREIGN KEY ("initiative_id") REFERENCES "company_initiatives"("id") ON DELETE cascade;

ALTER TABLE "initiative_signals"
  ADD CONSTRAINT "initiative_signals_signal_id_fk"
  FOREIGN KEY ("signal_id") REFERENCES "signals"("id") ON DELETE cascade;

ALTER TABLE "initiative_signals"
  ADD CONSTRAINT "initiative_signals_source_observation_id_fk"
  FOREIGN KEY ("source_observation_id") REFERENCES "signal_observations"("id") ON DELETE set null;

CREATE INDEX "initiative_signals_initiative_idx"
  ON "initiative_signals" ("initiative_id");

--> statement-breakpoint

-- Qualitative milestones — "hire 5 BDRs", "launch outbound stack",
-- "sign LOI with anchor customer". Sits alongside the signal-linked
-- progress for goals that don't map cleanly to a numeric signal.
CREATE TABLE "initiative_milestones" (
  "id" text PRIMARY KEY,
  "initiative_id" text NOT NULL,
  "label" text NOT NULL,
  -- 'todo' | 'in_progress' | 'done' | 'blocked'
  "status" text NOT NULL DEFAULT 'todo',
  -- Same free-form convention as initiative.due.
  "due_date" text,
  "completed_at" timestamp,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_by_email" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "initiative_milestones"
  ADD CONSTRAINT "initiative_milestones_initiative_id_fk"
  FOREIGN KEY ("initiative_id") REFERENCES "company_initiatives"("id") ON DELETE cascade;

CREATE INDEX "initiative_milestones_initiative_idx"
  ON "initiative_milestones" ("initiative_id", "sort_order");
