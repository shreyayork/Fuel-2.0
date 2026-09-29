UPDATE "initiative_milestones"
SET "due_date" = CASE
  WHEN "due_date" ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    THEN substring("due_date" FROM 6 FOR 2)
      || '-' || substring("due_date" FROM 9 FOR 2)
      || '-' || substring("due_date" FROM 1 FOR 4)
  WHEN "due_date" ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-[0-9]{4}$'
    THEN "due_date"
  ELSE NULL
END
WHERE "due_date" IS NOT NULL;

ALTER TABLE "initiative_milestones"
  ADD CONSTRAINT "initiative_milestones_due_date_format_check"
  CHECK (
    "due_date" IS NULL
    OR "due_date" ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-[0-9]{4}$'
  );
