CREATE TABLE "daily_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_notes_user_day_idx" ON "daily_notes" USING btree ("user_id","day");