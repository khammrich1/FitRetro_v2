ALTER TABLE "peptide_logs" ADD COLUMN "administered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "peptide_logs" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "peptide_logs" ADD COLUMN "dose_amount" real;--> statement-breakpoint
ALTER TABLE "peptide_logs" ADD COLUMN "dose_unit" "peptide_dose_unit";--> statement-breakpoint
ALTER TABLE "peptide_templates" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD COLUMN "dose_amount" real;--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD COLUMN "dose_unit" "supplement_dose_unit";--> statement-breakpoint
ALTER TABLE "supplement_templates" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
-- Backfill the new snapshot columns from each log's template, so history reads the same as it
-- did before — only rows that are still NULL are touched; nothing is overwritten.
UPDATE "peptide_logs" l SET "name" = t."name", "dose_amount" = t."dose_amount", "dose_unit" = t."dose_unit"
  FROM "peptide_templates" t WHERE l."peptide_template_id" = t."id" AND l."dose_amount" IS NULL;--> statement-breakpoint
UPDATE "supplement_logs" l SET "name" = t."name", "dose_amount" = t."dose_amount", "dose_unit" = t."dose_unit"
  FROM "supplement_templates" t WHERE l."supplement_template_id" = t."id" AND l."dose_amount" IS NULL;--> statement-breakpoint
-- A log whose creation time falls on the day it was logged for was logged in real time, so its
-- creation time is a fair dose time. Any other row (backdated, or stamped by migration 0028's
-- run time) stays NULL = unknown, rather than pretending to a precision it doesn't have.
UPDATE "peptide_logs" SET "administered_at" = "logged_at"
  WHERE "administered_at" IS NULL AND ("logged_at")::date = "logged_on";
