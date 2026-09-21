"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { verifySession } from "@/features/auth";
import { getOrCreateStripeCustomer } from "@/features/billing";
import { getStripeClient } from "@/lib/stripe";

/** Falls back to the production domain only if the Origin header is missing (rare) — reading it
 * from the request means checkout/portal return URLs correctly point at localhost in dev and the
 * real domain in prod, with nothing to configure per-environment. */
async function getSiteUrl(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin ?? "https://fitretro.app";
}

function requirePriceId(): string {
  if (!process.env.STRIPE_PRICE_ID) {
    throw new Error("STRIPE_PRICE_ID is not configured. Set it in .env to enable billing.");
  }
  return process.env.STRIPE_PRICE_ID;
}

/** Looks up a human-readable Promotion Code (e.g. "FREEMONTH") to the Stripe object ID Checkout
 * actually needs. Returns null (silently) for an unknown/inactive code rather than erroring the
 * whole checkout — falling back to the always-available "enter a code" field is a better
 * experience than blocking checkout over a stale sticker/link. */
async function findActivePromotionCodeId(code: string): Promise<string | null> {
  const stripe = getStripeClient();
  const results = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
  return results.data[0]?.id ?? null;
}

export async function createCheckoutSessionAction(promoCode?: string): Promise<void> {
  const { userId } = await verifySession();
  const stripe = getStripeClient();
  const priceId = requirePriceId();
  const siteUrl = await getSiteUrl();
  const customerId = await getOrCreateStripeCustomer(userId);

  const promotionCodeId = promoCode ? await findActivePromotionCodeId(promoCode) : null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Mutually exclusive with allow_promotion_codes: pre-apply a known code, otherwise let the
    // customer type one in manually.
    ...(promotionCodeId
      ? { discounts: [{ promotion_code: promotionCodeId }] }
      : { allow_promotion_codes: true }),
    success_url: `${siteUrl}/settings/billing?checkout=success`,
    cancel_url: `${siteUrl}/subscribe`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }
  redirect(session.url);
}

export async function createBillingPortalSessionAction(): Promise<void> {
  const { userId } = await verifySession();
  const stripe = getStripeClient();
  const siteUrl = await getSiteUrl();
  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/settings/billing`,
  });

  redirect(session.url);
}
