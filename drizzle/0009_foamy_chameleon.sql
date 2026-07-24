CREATE TABLE "workout_split_cycle_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_day_id" uuid NOT NULL,
	"completed_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_split_cycle_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"muscle_groups" "muscle_group"[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_split_cycle_completions" ADD CONSTRAINT "workout_split_cycle_completions_cycle_day_id_workout_split_cycle_days_id_fk" FOREIGN KEY ("cycle_day_id") REFERENCES "public"."workout_split_cycle_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_split_cycle_days" ADD CONSTRAINT "workout_split_cycle_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_split_cycle_days_user_order_idx" ON "workout_split_cycle_days" USING btree ("user_id","sort_order");