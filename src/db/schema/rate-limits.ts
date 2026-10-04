import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/** Fixed-window counters for abuse limits (login, signup, password reset). One row per key
 * (e.g. "login:ip:1.2.3.4"); each attempt is a single atomic upsert that either bumps the count
 * or starts a fresh window — see @/features/auth/rate-limit. Rows are small and stale ones are
 * swept opportunistically. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
