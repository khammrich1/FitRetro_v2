CREATE TABLE "water_intake" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"ounces" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "water_intake" ADD CONSTRAINT "water_intake_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "water_intake_user_day_idx" ON "water_intake" USING btree ("user_id","day");