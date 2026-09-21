import { pgTable, uuid, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Mirrors Stripe's own Subscription.status values directly, so no translation layer is needed
 * between what Stripe sends and what's stored. */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];

/** One row per user's current subscription, written only by the Stripe webhook
 * (src/app/api/stripe/webhook/route.ts) — never by app code directly, so this always reflects
 * what Stripe actually has on file rather than what the app assumed happened. No row exists
 * until a checkout actually completes; starting a checkout alone doesn't create one.
 *
 * Framework-only for now: nothing in the app reads this to gate access yet. */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  status: subscriptionStatusEnum("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
