ALTER TABLE "peptide_logs" ADD COLUMN "logged_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "peptide_templates" ADD COLUMN "vial_amount_mg" real;--> statement-breakpoint
ALTER TABLE "peptide_templates" ADD COLUMN "bac_water_ml" real;--> statement-breakpoint
ALTER TABLE "peptide_templates" ADD COLUMN "half_life_hours" real;