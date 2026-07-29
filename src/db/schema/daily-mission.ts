import { pgTable, uuid, text, integer, date, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";

/** One item the user typed in for a specific day's mission — entered fresh each day (not a
 * recurring template), and mandatory on the Today page (distinct from the optional, multi-routine
 * Routines feature). */
export const dailyMissionEntries = pgTable(
  "daily_mission_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    day: date("day").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    completed: boolean("completed").default(false).notNull(),
  },
  (table) => [index("daily_mission_entries_user_day_idx").on(table.userId, table.day)],
);

export type DailyMissionEntry = typeof dailyMissionEntries.$inferSelect;
export type NewDailyMissionEntry = typeof dailyMissionEntries.$inferInsert;
