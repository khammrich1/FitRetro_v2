import { pgTable, uuid, text, timestamp, integer, date, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

/** A habit the user is trying to build (e.g. "Work out 3x/week"). */
export const habits = pgTable("habits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  targetPerWeek: integer("target_per_week").notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  points: integer("points").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A single day's completion record for a habit, driving streaks/points. */
export const habitLogs = pgTable("habit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  habitId: uuid("habit_id")
    .references(() => habits.id, { onDelete: "cascade" })
    .notNull(),
  completedOn: date("completed_on").notNull(),
  completed: boolean("completed").default(true).notNull(),
});

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitLog = typeof habitLogs.$inferSelect;
export type NewHabitLog = typeof habitLogs.$inferInsert;
