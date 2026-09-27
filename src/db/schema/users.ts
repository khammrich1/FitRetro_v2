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
  /** Stripe Customer ID, created lazily the first time this user starts a checkout — null until
   * then. Independent of whether they ever complete a subscription (see subscriptions table),
   * so a customer can be reused across multiple checkout attempts. */
  stripeCustomerId: text("stripe_customer_id"),
  /** Acquisition campaign active when the account was created (e.g. "promo1" for the QR
   * sticker), read from the fr_campaign cookie at signup. Null for everyone else, including
   * existing users who later scan a sticker — this records how the account was acquired. */
  signupCampaign: text("signup_campaign"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
