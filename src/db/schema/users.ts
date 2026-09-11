import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export type Sex = (typeof sexEnum.enumValues)[number];

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  /** Set from Settings > Nutrition's "Get a suggested goal" card, solely to seed a default macro
   * goal via Mifflin-St Jeor — not used anywhere else. Neither field updates itself over time. */
  sex: sexEnum("sex"),
  age: integer("age"),
  /** User's preferred display order for fat/carbs/protein (e.g. "fat,carbs,protein"), applied
   * everywhere macros are shown. Null means "use the default nutrition-label order" — see
   * @/lib/macro-order. Independent of nutritionGoals so it can be set before any goal exists. */
  macroOrder: text("macro_order"),
  /** Comma-separated subscribed daily-reading topics (e.g. "leadership,discipline"), same
   * parse/stringify convention as macroOrder — see @/lib/reading-topics. Null/empty means not
   * subscribed to anything, so the Daily Reader is hidden entirely rather than defaulting on. */
  readingTopics: text("reading_topics"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
