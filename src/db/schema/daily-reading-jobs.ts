import { pgTable, uuid, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { readingTopicEnum } from "./daily-reading";

/** Single-flight lease for generating one (day, topic) reading. Before paying for a generation,
 * a request must claim the row; a claim that's older than the lease window can be taken over
 * (the earlier attempt failed or died), which doubles as retry backoff. Without this, every
 * request that saw a cache miss at the same moment generated — and paid for — its own copy. */
export const dailyReadingJobs = pgTable(
  "daily_reading_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    day: date("day").notNull(),
    topic: readingTopicEnum("topic").notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("daily_reading_jobs_day_topic_idx").on(table.day, table.topic)],
);
