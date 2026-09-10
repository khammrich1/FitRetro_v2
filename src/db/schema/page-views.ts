import { pgTable, uuid, text, date, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/** First-party, server-logged page view — written from src/proxy.ts (Node.js runtime), never a
 * client-side analytics SDK. userId is null for signed-out visits. No IP/user-agent/geolocation,
 * no query strings — path is always one of the fixed prefixes proxy.ts recognizes. */
export const pageViews = pgTable("page_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  path: text("path").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;
