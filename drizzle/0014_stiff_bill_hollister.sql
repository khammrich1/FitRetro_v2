CREATE TABLE "daily_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"field_1" text DEFAULT '' NOT NULL,
	"field_1_completed" boolean DEFAULT false NOT NULL,
	"field_2" text DEFAULT '' NOT NULL,
	"field_2_completed" boolean DEFAULT false NOT NULL,
	"field_3" text DEFAULT '' NOT NULL,
	"field_3_completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_missions" ADD CONSTRAINT "daily_missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_missions_user_day_idx" ON "daily_missions" USING btree ("user_id","day");