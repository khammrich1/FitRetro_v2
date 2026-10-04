ALTER TABLE "users" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "logged_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "workouts_user_started_at_idx" ON "workouts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "body_measurements_user_recorded_at_idx" ON "body_measurements" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "nutrition_entries_user_logged_at_idx" ON "nutrition_entries" USING btree ("user_id","logged_at");--> statement-breakpoint
CREATE INDEX "peptide_logs_logged_on_idx" ON "peptide_logs" USING btree ("logged_on");--> statement-breakpoint
CREATE INDEX "supplement_logs_logged_on_idx" ON "supplement_logs" USING btree ("logged_on");--> statement-breakpoint
-- Sets that already have something entered were performed as far as anyone can tell; mark them
-- logged so past scores don't drop. Only rows with no value at all stay "planned".
UPDATE "workout_sets" SET "logged_at" = now()
  WHERE "logged_at" IS NULL AND ("reps" IS NOT NULL OR "weight_kg" IS NOT NULL OR "duration_seconds" IS NOT NULL OR "rpe" IS NOT NULL);
