import { pgTable, uuid, text, timestamp, integer, date, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/** A named daily routine the user builds (e.g. "Morning Routine", "Evening Wind-down"). */
export const routines = pgTable("routines", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** One ordered step in a routine, with optional notes for detail (today's affirmation, what to read, etc). */
export const routineItems = pgTable("routine_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  routineId: uuid("routine_id")
    .references(() => routines.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

/** Marks a routine item as completed on a given calendar day. */
export const routineCompletions = pgTable(
  "routine_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    routineItemId: uuid("routine_item_id")
      .references(() => routineItems.id, { onDelete: "cascade" })
      .notNull(),
    completedOn: date("completed_on").notNull(),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("routine_completions_item_day_idx").on(table.routineItemId, table.completedOn),
  ],
);

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
export type RoutineItem = typeof routineItems.$inferSelect;
export type NewRoutineItem = typeof routineItems.$inferInsert;
export type RoutineCompletion = typeof routineCompletions.$inferSelect;
