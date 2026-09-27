import "server-only";
import type Stripe from "stripe";

/** Statuses meaning the customer is still subscribed (or owes on a subscription). Starting a
 * second checkout would double-bill them — they belong in the billing portal instead. Canceled,
 * incomplete and incomplete_expired subscriptions don't block a fresh checkout. */
const BLOCKING_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

/** Asks Stripe itself, not the webhook-fed subscriptions table, so a delayed or failed webhook
 * can't let someone pay twice. */
export async function hasBlockingSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<boolean> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  return subscriptions.data.some((subscription) => BLOCKING_STATUSES.has(subscription.status));
}

/** Only one open Checkout Session per customer at a time: a double tap, a second tab, or the
 * back button would otherwise leave two payable sessions open. Rejects if any can't be expired,
 * so the caller can fail closed. */
export async function expireOpenCheckoutSessions(
  stripe: Stripe,
  customerId: string,
): Promise<void> {
  const sessions = await stripe.checkout.sessions.list({
    customer: customerId,
    status: "open",
    limit: 100,
  });
  await Promise.all(sessions.data.map((session) => stripe.checkout.sessions.expire(session.id)));
}
