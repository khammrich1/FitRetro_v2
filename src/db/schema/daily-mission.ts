import { pgTable, uuid, text, integer, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/** One user-defined item in their single, always-on-Today daily mission checklist (distinct from
 * the optional, multi-routine Routines feature). */
export const dailyMissionItems = pgTable("daily_mission_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Marks a mission item as completed on a given calendar day. */
export const dailyMissionCompletions = pgTable(
  "daily_mission_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .references(() => dailyMissionItems.id, { onDelete: "cascade" })
      .notNull(),
    completedOn: date("completed_on").notNull(),
  },
  (table) => [
    uniqueIndex("daily_mission_completions_item_day_idx").on(table.itemId, table.completedOn),
  ],
);

export type DailyMissionItem = typeof dailyMissionItems.$inferSelect;
export type NewDailyMissionItem = typeof dailyMissionItems.$inferInsert;
export type DailyMissionCompletion = typeof dailyMissionCompletions.$inferSelect;
