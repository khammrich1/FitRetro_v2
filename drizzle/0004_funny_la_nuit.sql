CREATE TABLE "workout_split_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"label" text NOT NULL,
	"muscle_groups" "muscle_group"[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_split_days" ADD CONSTRAINT "workout_split_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_split_days_user_day_idx" ON "workout_split_days" USING btree ("user_id","day_of_week");