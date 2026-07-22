CREATE TABLE "nutrition_entry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" text NOT NULL,
	"calories" integer NOT NULL,
	"protein_grams" real NOT NULL,
	"carbs_grams" real NOT NULL,
	"fat_grams" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nutrition_entry_items" ADD CONSTRAINT "nutrition_entry_items_entry_id_nutrition_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."nutrition_entries"("id") ON DELETE cascade ON UPDATE no action;