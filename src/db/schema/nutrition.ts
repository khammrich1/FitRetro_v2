import { pgTable, uuid, text, timestamp, real, integer, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

/** A logged food/meal entry with macro breakdown. */
export const nutritionEntries = pgTable("nutrition_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  description: text("description").notNull(),
  calories: integer("calories").notNull(),
  proteinGrams: real("protein_grams").notNull(),
  carbsGrams: real("carbs_grams").notNull(),
  fatGrams: real("fat_grams").notNull(),
  recipeId: uuid("recipe_id"),
});

export type NutritionEntry = typeof nutritionEntries.$inferSelect;
export type NewNutritionEntry = typeof nutritionEntries.$inferInsert;

/** A user's daily calorie/macro targets, one row per user. */
export const nutritionGoals = pgTable("nutrition_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  dailyCalories: integer("daily_calories").notNull(),
  dailyProteinGrams: real("daily_protein_grams").notNull(),
  dailyCarbsGrams: real("daily_carbs_grams").notNull(),
  dailyFatGrams: real("daily_fat_grams").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type NutritionGoal = typeof nutritionGoals.$inferSelect;
export type NewNutritionGoal = typeof nutritionGoals.$inferInsert;
