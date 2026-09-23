import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions, type Subscription, type SubscriptionStatus } from "@/db/schema";

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  return subscription ?? null;
}

export type SubscriptionUpsertInput = {
  userId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

/** Called only from the Stripe webhook — this is the single place subscription state gets
 * written, so it always reflects what Stripe actually has rather than what the app assumed
 * happened. Upserts on userId: a user has at most one tracked subscription at a time, which
 * matches the single-plan design (no upgrade/downgrade between different subscriptions yet). */
export async function upsertSubscriptionFromStripe(input: SubscriptionUpsertInput): Promise<void> {
  await db
    .insert(subscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeSubscriptionId: input.stripeSubscriptionId,
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });
}
