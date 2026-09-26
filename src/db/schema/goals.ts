import { pgTable, uuid, text, date, pgEnum, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const goalStatusEnum = pgEnum("goal_status", ["active", "achieved"]);
export type GoalStatus = (typeof goalStatusEnum.enumValues)[number];

/** How precisely the achievement date is known. People often remember *that* they hit a
 * milestone but not the exact day ("sometime in March", "some time in 2026"), so the date is
 * stored at the precision they gave: a month is stored as its 1st, a year as Jan 1. */
export const datePrecisionEnum = pgEnum("date_precision", ["day", "month", "year"]);
export type DatePrecision = (typeof datePrecisionEnum.enumValues)[number];

/** A goal the user is working toward (e.g. "Do a muscle up"). Once achieved it becomes a
 * milestone — same row, status "achieved" — so the time from starting to achieving is kept. */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    status: goalStatusEnum("status").default("active").notNull(),
    /** When the user started working toward it. Optional: a milestone logged after the fact may
     * never have been a tracked goal. */
    startedOn: date("started_on"),
    targetDate: date("target_date"),
    achievedOn: date("achieved_on"),
    achievedPrecision: datePrecisionEnum("achieved_precision"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("goals_user_status_idx").on(table.userId, table.status)],
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
