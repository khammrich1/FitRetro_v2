import type Stripe from "stripe";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { parseCampaign, upsertSubscriptionFromStripe } from "@/features/billing";
import { subscriptionStatusEnum, type SubscriptionStatus } from "@/db/schema";

/** Stripe's TS type for subscription status includes an open-ended "OtherString" escape hatch
 * for forward-compatibility, which collapses to plain `string` for assignability — so this
 * actually checks membership against the exact set our subscription_status enum uses (see
 * src/db/schema/subscriptions.ts) rather than just casting. */
function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const known: readonly string[] = subscriptionStatusEnum.enumValues;
  if (!known.includes(status)) {
    throw new Error(`Unrecognized Stripe subscription status: "${status}"`);
  }
  return status as SubscriptionStatus;
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) {
    // Shouldn't happen for subscriptions created through createCheckoutSessionAction (which
    // always sets subscription_data.metadata.userId), but don't crash the webhook over one
    // unattributable event.
    console.error(`Stripe subscription ${subscription.id} has no userId in metadata — skipping.`);
    return;
  }

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  await upsertSubscriptionFromStripe({
    userId,
    stripeSubscriptionId: subscription.id,
    status: toSubscriptionStatus(subscription.status),
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    // Only a known campaign is recorded — metadata can also be edited by hand in the dashboard.
    campaign: parseCampaign(subscription.metadata.campaign),
  });
}

export async function POST(request: Request): Promise<Response> {
  // Outside the try below on purpose: missing/invalid config should surface as a 500 (and be
  // retried by Stripe once fixed), not be misreported as a bad signature.
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    // Message only: Stripe's verification error object also carries the raw payload (customer
    // details) and the signature header, neither of which belongs in logs.
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe webhook signature verification failed: ${message}`);
    return new Response("Invalid signature.", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(event.data.object);
      break;
    default:
      // Not every event type sent to this endpoint needs handling — anything else is ignored.
      break;
  }

  return Response.json({ received: true });
}
