import { pgTable, uuid, text, timestamp, real, integer, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

export type MealType = (typeof mealTypeEnum.enumValues)[number];

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

/** One food item that contributed to a logged entry's totals, for a detail breakdown. */
export const nutritionEntryItems = pgTable("nutrition_entry_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .references(() => nutritionEntries.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  calories: integer("calories").notNull(),
  proteinGrams: real("protein_grams").notNull(),
  carbsGrams: real("carbs_grams").notNull(),
  fatGrams: real("fat_grams").notNull(),
});

export type NutritionEntryItem = typeof nutritionEntryItems.$inferSelect;
export type NewNutritionEntryItem = typeof nutritionEntryItems.$inferInsert;

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

/** A reusable, user-defined meal (e.g. "Usual breakfast") with pre-computed macros, so logging a
 * meal you eat often doesn't require re-estimating it every time. */
export const mealTemplates = pgTable("meal_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** One food item within a meal template, with its own macro breakdown. */
export const mealTemplateItems = pgTable("meal_template_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .references(() => mealTemplates.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  calories: integer("calories").notNull(),
  proteinGrams: real("protein_grams").notNull(),
  carbsGrams: real("carbs_grams").notNull(),
  fatGrams: real("fat_grams").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export type MealTemplate = typeof mealTemplates.$inferSelect;
export type NewMealTemplate = typeof mealTemplates.$inferInsert;
export type MealTemplateItem = typeof mealTemplateItems.$inferSelect;
export type NewMealTemplateItem = typeof mealTemplateItems.$inferInsert;
