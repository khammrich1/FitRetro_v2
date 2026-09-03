import { pgTable, uuid, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { users } from "./users";

/** An item the user has on hand, used to ground food suggestions in what's actually available.
 * The `*PerPortion` macro columns are null for a plain staple item, and set when the item is a
 * meal-prepped batch portion (see features/nutrition/meal-prep) — their presence is what makes an
 * item show up as a one-tap-loggable "prepped meal" on Today. */
export const pantryItems = pgTable("pantry_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  caloriesPerPortion: integer("calories_per_portion"),
  proteinGramsPerPortion: real("protein_grams_per_portion"),
  carbsGramsPerPortion: real("carbs_grams_per_portion"),
  fatGramsPerPortion: real("fat_grams_per_portion"),
  totalPortions: integer("total_portions"),
  portionsRemaining: integer("portions_remaining"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PantryItem = typeof pantryItems.$inferSelect;
export type NewPantryItem = typeof pantryItems.$inferInsert;
