import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/** An item the user has on hand, used to ground food suggestions in what's actually available. */
export const pantryItems = pgTable("pantry_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PantryItem = typeof pantryItems.$inferSelect;
export type NewPantryItem = typeof pantryItems.$inferInsert;
