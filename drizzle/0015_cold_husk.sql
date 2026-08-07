CREATE TYPE "public"."supplement_dose_unit" AS ENUM('mg', 'g', 'mcg', 'iu', 'ml', 'capsule', 'tablet', 'gummy', 'scoop', 'drop');--> statement-breakpoint
CREATE TYPE "public"."supplement_frequency" AS ENUM('daily', 'every_other_day', 'twice_weekly', 'three_times_weekly', 'weekly', 'as_needed');--> statement-breakpoint
CREATE TABLE "supplement_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplement_template_id" uuid NOT NULL,
	"logged_on" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplement_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dose_amount" real NOT NULL,
	"dose_unit" "supplement_dose_unit" NOT NULL,
	"frequency" "supplement_frequency" NOT NULL,
	"preferred_time" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_supplement_template_id_supplement_templates_id_fk" FOREIGN KEY ("supplement_template_id") REFERENCES "public"."supplement_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_templates" ADD CONSTRAINT "supplement_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;