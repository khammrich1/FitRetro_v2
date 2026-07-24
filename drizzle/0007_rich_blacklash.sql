CREATE TYPE "public"."peptide_dose_unit" AS ENUM('mcg', 'mg', 'iu', 'ml');--> statement-breakpoint
CREATE TYPE "public"."peptide_frequency" AS ENUM('daily', 'every_other_day', 'twice_weekly', 'three_times_weekly', 'weekly', 'as_needed');--> statement-breakpoint
CREATE TABLE "peptide_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peptide_template_id" uuid NOT NULL,
	"logged_on" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peptide_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dose_amount" real NOT NULL,
	"dose_unit" "peptide_dose_unit" NOT NULL,
	"frequency" "peptide_frequency" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "peptide_logs" ADD CONSTRAINT "peptide_logs_peptide_template_id_peptide_templates_id_fk" FOREIGN KEY ("peptide_template_id") REFERENCES "public"."peptide_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peptide_templates" ADD CONSTRAINT "peptide_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;