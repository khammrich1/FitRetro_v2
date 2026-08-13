import { pgTable, uuid, text, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const feedbackCategoryEnum = pgEnum("feedback_category", ["bug", "idea", "other"]);
export type FeedbackCategory = (typeof feedbackCategoryEnum.enumValues)[number];

export const feedbackStatusEnum = pgEnum("feedback_status", ["open", "resolved"]);
export type FeedbackStatus = (typeof feedbackStatusEnum.enumValues)[number];

/** Free-text feedback about the app itself (bug reports, feature ideas, anything else) —
 * unrelated to in-app content like recipes or workout templates. Reviewed by the site owner
 * alone via requireOwner(), same gating as the Wake Up page. */
export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  category: feedbackCategoryEnum("category").notNull(),
  message: text("message").notNull(),
  status: feedbackStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
