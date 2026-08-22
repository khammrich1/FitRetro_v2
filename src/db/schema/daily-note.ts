import { pgTable, uuid, text, date, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/** A user's free-text note for a given calendar day — one mutable note per (user, day), same
 * upsert shape as daily_missions/water_intake, not a log of discrete entries. */
export const dailyNotes = pgTable(
  "daily_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    day: date("day").notNull(),
    note: text("note").default("").notNull(),
  },
  (table) => [uniqueIndex("daily_notes_user_day_idx").on(table.userId, table.day)],
);

export type DailyNote = typeof dailyNotes.$inferSelect;
export type NewDailyNote = typeof dailyNotes.$inferInsert;
