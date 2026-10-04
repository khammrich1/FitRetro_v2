import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Ledger of Stripe webhook events we've applied, keyed by Stripe's event id. Inserted in the
 * same transaction as the subscription write, so an event is recorded only once it has actually
 * taken effect; a redelivery (Stripe retries, or the same event twice) hits the primary key and
 * is skipped. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  /** Stripe's own timestamp for the event, used for ordering. */
  created: timestamp("created", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});
