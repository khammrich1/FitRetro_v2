CREATE TABLE "meal_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" text NOT NULL,
	"calories" integer NOT NULL,
	"protein_grams" real NOT NULL,
	"carbs_grams" real NOT NULL,
	"fat_grams" real NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_template_id_meal_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."meal_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;