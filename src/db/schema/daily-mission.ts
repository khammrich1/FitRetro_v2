import { pgTable, uuid, text, date, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/** A user's mission for one calendar day — always exactly 3 static, user-filled-in fields (not a
 * user-managed list), mandatory on the Today page and distinct from the optional Routines
 * feature. One row per (user, day); values don't carry over between days. */
export const dailyMissions = pgTable(
  "daily_missions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    day: date("day").notNull(),
    field1: text("field_1").default("").notNull(),
    field1Completed: boolean("field_1_completed").default(false).notNull(),
    field2: text("field_2").default("").notNull(),
    field2Completed: boolean("field_2_completed").default(false).notNull(),
    field3: text("field_3").default("").notNull(),
    field3Completed: boolean("field_3_completed").default(false).notNull(),
  },
  (table) => [uniqueIndex("daily_missions_user_day_idx").on(table.userId, table.day)],
);

export type DailyMission = typeof dailyMissions.$inferSelect;
export type NewDailyMission = typeof dailyMissions.$inferInsert;
