import { pgTable, uuid, integer, date, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/** A user's total water intake (ounces) for a given calendar day — a single running total set via
 * a slider throughout the day, not discrete log entries like meals/peptides/supplements. */
export const waterIntake = pgTable(
  "water_intake",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    day: date("day").notNull(),
    ounces: integer("ounces").default(0).notNull(),
  },
  (table) => [uniqueIndex("water_intake_user_day_idx").on(table.userId, table.day)],
);

export type WaterIntake = typeof waterIntake.$inferSelect;
export type NewWaterIntake = typeof waterIntake.$inferInsert;
