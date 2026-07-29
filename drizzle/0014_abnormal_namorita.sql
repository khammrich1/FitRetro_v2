CREATE TABLE "daily_mission_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"completed_on" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_mission_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_mission_completions" ADD CONSTRAINT "daily_mission_completions_item_id_daily_mission_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."daily_mission_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_mission_items" ADD CONSTRAINT "daily_mission_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_mission_completions_item_day_idx" ON "daily_mission_completions" USING btree ("item_id","completed_on");