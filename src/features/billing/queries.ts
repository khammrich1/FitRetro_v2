import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  stripeEvents,
  subscriptions,
  type Subscription,
  type SubscriptionStatus,
} from "@/db/schema";
import { decideSubscriptionEvent } from "./ordering";

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  return subscription ?? null;
}

export type SubscriptionEventInput = {
  event: { id: string; type: string; created: Date };
  subscription: {
    userId: string;
    stripeSubscriptionId: string;
    stripeSubscriptionCreated: Date;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    campaign: string | null;
  };
};

export type SubscriptionEventResult =
  "applied" | "duplicate" | "stale_event" | "stale_subscription";

/** Called only from the Stripe webhook — the single place subscription state gets written, so it
 * always reflects what Stripe actually has rather than what the app assumed happened. One
 * transaction does three things:
 *
 * 1. Records the event id in the ledger; if it's already there this is a redelivery, and nothing
 *    else happens. The ledger row is only committed together with the write it describes, so a
 *    failure (→ 500 → Stripe retries) never leaves an event marked as applied.
 * 2. Locks the user's row and asks the ordering rules whether this event is newer than what's
 *    on file — a delayed event about the same subscription, or any event about an older,
 *    replaced subscription, is recorded in the ledger and otherwise ignored.
 * 3. Upserts on userId: a user has at most one tracked subscription at a time, which matches the
 *    single-plan design. */
export async function applySubscriptionEvent(
  input: SubscriptionEventInput,
): Promise<SubscriptionEventResult> {
  const { event, subscription } = input;
  return db.transaction(async (tx) => {
    const recorded = await tx
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type, created: event.created })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    if (recorded.length === 0) return "duplicate";

    const [stored] = await tx
      .select({
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeSubscriptionCreated: subscriptions.stripeSubscriptionCreated,
        lastEventCreated: subscriptions.lastEventCreated,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, subscription.userId))
      .for("update");

    const decision = decideSubscriptionEvent(stored ?? null, {
      eventCreated: event.created,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeSubscriptionCreated: subscription.stripeSubscriptionCreated,
    });
    if (decision !== "apply") return decision;

    const values = {
      userId: subscription.userId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeSubscriptionCreated: subscription.stripeSubscriptionCreated,
      lastEventCreated: event.created,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      campaign: subscription.campaign,
    };
    await tx
      .insert(subscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { ...values, updatedAt: new Date() },
      });
    return "applied";
  });
}
