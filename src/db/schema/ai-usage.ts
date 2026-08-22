import { pgTable, uuid, integer, date, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Counts AI-powered actions (macro/workout estimation, suggestions, recipes, photo scans, note
 * cleanup) per (user, day) — a flat cap across all of them, not cost-weighted per feature. Used
 * to bound worst-case API cost per user; the owner account is exempt (checked in
 * features/ai-usage, not stored here). */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    day: date("day").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (table) => [uniqueIndex("ai_usage_user_day_idx").on(table.userId, table.day)],
);

export type AiUsage = typeof aiUsage.$inferSelect;
export type NewAiUsage = typeof aiUsage.$inferInsert;
