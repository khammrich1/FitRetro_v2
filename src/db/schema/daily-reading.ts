import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const readingTopicEnum = pgEnum("reading_topic", [
  "self_help",
  "leadership",
  "discipline",
  "time_management",
]);
export type ReadingTopic = (typeof readingTopicEnum.enumValues)[number];

/** One AI-generated short read per (day, topic) — shared across every user subscribed to that
 * topic, not per-user. Generated lazily the first time someone's Today page needs a topic that
 * day hasn't produced yet (see src/features/daily-reading/queries.ts), so there's no separate
 * scheduled job. */
export const dailyReadings = pgTable(
  "daily_readings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    day: date("day").notNull(),
    topic: readingTopicEnum("topic").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readMinutes: integer("read_minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("daily_readings_day_topic_idx").on(table.day, table.topic)],
);

export type DailyReading = typeof dailyReadings.$inferSelect;
export type NewDailyReading = typeof dailyReadings.$inferInsert;
