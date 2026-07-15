import { pgTable, uuid, text, timestamp, real, integer, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

/** An ingredient line item stored on a recipe. */
export type RecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

/** A recipe, optionally generated via LLM, with macro totals per serving. */
export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  ingredients: jsonb("ingredients").$type<RecipeIngredient[]>().notNull(),
  servings: integer("servings").notNull(),
  caloriesPerServing: integer("calories_per_serving"),
  proteinGramsPerServing: real("protein_grams_per_serving"),
  carbsGramsPerServing: real("carbs_grams_per_serving"),
  fatGramsPerServing: real("fat_grams_per_serving"),
  generatedByLlm: text("generated_by_llm"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
