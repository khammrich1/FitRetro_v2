"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type Stripe from "stripe";
import { verifySession } from "@/features/auth";
import {
  CAMPAIGN_COOKIE_NAME,
  STICKER_CAMPAIGN_METADATA,
  expireOpenCheckoutSessions,
  getOrCreateStripeCustomer,
  hasBlockingSubscription,
  parseCampaign,
} from "@/features/billing";
import { getStripeClient, getStripePriceId, getStripePromoCode } from "@/lib/stripe";

/** Falls back to the production domain only if the Origin header is missing (rare) — reading it
 * from the request means checkout/portal return URLs correctly point at localhost in dev and the
 * real domain in prod, with nothing to configure per-environment. */
async function getSiteUrl(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin ?? "https://fitretro.app";
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

/** Why a checkout was stopped — /subscribe maps each code to a fixed message. The promo_ codes
 * are sticker-only; billing_unavailable can happen on any checkout. */
export type CheckoutError = "promo_unavailable" | "promo_rejected" | "billing_unavailable";

/** Type/code only, never the message: Stripe error messages can echo a masked fragment of the
 * API key (e.g. on authentication failures). */
function describeStripeError(error: unknown): string {
  if (error && typeof error === "object") {
    const { type, code } = error as { type?: unknown; code?: unknown };
    const parts = [type, code].filter((part): part is string => typeof part === "string");
    if (parts.length > 0) return parts.join("/");
  }
  // Not a Stripe error (no `type`): our own config errors, which name a variable, never a value.
  if (error instanceof Error) return error.message;
  return "unknown error";
}

/** Resolves STRIPE_PROMO_CODE to a currently redeemable promotion code ID. Null (with the reason
 * logged) if it's unset, unknown, inactive, expired, used up, or Stripe can't be reached — and
 * the caller must then stop, since the sticker promises a free month. */
async function findStickerPromotionCodeId(stripe: Stripe): Promise<string | null> {
  const code = getStripePromoCode();
  if (!code) {
    console.error("Sticker checkout stopped: STRIPE_PROMO_CODE is not configured.");
    return null;
  }

  let promotionCode: Stripe.PromotionCode | undefined;
  try {
    const results = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    promotionCode = results.data[0];
  } catch (error) {
    console.error(
      `Sticker checkout stopped: promotion code lookup failed (${describeStripeError(error)}).`,
    );
    return null;
  }

  if (!promotionCode || !isRedeemable(promotionCode)) {
    console.error("Sticker checkout stopped: STRIPE_PROMO_CODE is not an active, redeemable code.");
    return null;
  }
  return promotionCode.id;
}

function isRedeemable(promotionCode: Stripe.PromotionCode): boolean {
  const nowSeconds = Date.now() / 1000;
  return (
    promotionCode.active &&
    (promotionCode.expires_at === null || promotionCode.expires_at > nowSeconds) &&
    (promotionCode.max_redemptions === null ||
      promotionCode.times_redeemed < promotionCode.max_redemptions)
  );
}

function checkoutStopped(reason: CheckoutError): never {
  redirect(`/subscribe?error=${reason}`);
}

/** Runs right before creating a Checkout Session. Stops (redirects) if the customer already has
 * a live subscription, or if Stripe can't be asked — failing closed, since the alternative is
 * risking a second charge. */
async function ensureCustomerCanStartCheckout(stripe: Stripe, customerId: string): Promise<void> {
  let alreadySubscribed: boolean;
  try {
    // Expire first, then check: if an old session completes in between, its subscription
    // already exists by the time we look.
    await expireOpenCheckoutSessions(stripe, customerId);
    alreadySubscribed = await hasBlockingSubscription(stripe, customerId);
  } catch (error) {
    console.error(
      `Checkout stopped: couldn't verify existing subscriptions (${describeStripeError(error)}).`,
    );
    checkoutStopped("billing_unavailable");
  }
  if (alreadySubscribed) {
    redirect("/settings/billing?notice=already_subscribed");
  }
}

/** Runs one Stripe-backed step of checkout. Any failure — Stripe down, bad config, timeout —
 * stops checkout with the "try again" message instead of an error page. `step` must not call
 * redirect() itself, so Next's redirect signal is never swallowed here. */
async function checkoutStep<T>(label: string, step: () => Promise<T>): Promise<T> {
  try {
    return await step();
  } catch (error) {
    console.error(`Checkout stopped: ${label} failed (${describeStripeError(error)}).`);
    checkoutStopped("billing_unavailable");
  }
}

export async function createCheckoutSessionAction(promoCode?: string): Promise<void> {
  const { userId } = await verifySession();
  const campaign = parseCampaign((await cookies()).get(CAMPAIGN_COOKIE_NAME)?.value);
  const siteUrl = await getSiteUrl();
  const { stripe, priceId } = await checkoutStep("billing configuration", async () => ({
    stripe: getStripeClient(),
    priceId: getStripePriceId(),
  }));

  const baseParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/settings/billing?checkout=success`,
    cancel_url: `${siteUrl}/subscribe`,
  } satisfies Stripe.Checkout.SessionCreateParams;

  if (campaign) {
    // Resolved before creating any Stripe customer or session: if the promised free month can't
    // be applied, stop here rather than falling through to a full-price checkout.
    const promotionCodeId = await findStickerPromotionCodeId(stripe);
    if (!promotionCodeId) checkoutStopped("promo_unavailable");

    const customerId = await checkoutStep("customer lookup", () =>
      getOrCreateStripeCustomer(userId),
    );
    await ensureCustomerCanStartCheckout(stripe, customerId);
    const metadata = { userId, ...STICKER_CAMPAIGN_METADATA };

    let checkoutUrl: string | null;
    try {
      const session = await stripe.checkout.sessions.create({
        ...baseParams,
        customer: customerId,
        discounts: [{ promotion_code: promotionCodeId }],
        metadata,
        subscription_data: { metadata },
      });
      checkoutUrl = session.url;
    } catch (error) {
      // No session exists either way, so nothing can be charged. An invalid-request error means
      // Stripe refused the discount itself (e.g. this customer isn't eligible); anything else is
      // an outage.
      const rejected = (error as { type?: unknown } | null)?.type === "StripeInvalidRequestError";
      console.error(`Sticker checkout stopped: ${describeStripeError(error)}.`);
      checkoutStopped(rejected ? "promo_rejected" : "billing_unavailable");
    }
    if (!checkoutUrl) checkoutStopped("billing_unavailable");
    redirect(checkoutUrl);
  }

  const customerId = await checkoutStep("customer lookup", () => getOrCreateStripeCustomer(userId));
  await ensureCustomerCanStartCheckout(stripe, customerId);
  const promotionCodeId = promoCode
    ? await checkoutStep("promotion code lookup", () => findActivePromotionCodeId(promoCode))
    : null;

  const session = await checkoutStep("checkout session", () =>
    stripe.checkout.sessions.create({
      ...baseParams,
      customer: customerId,
      // Mutually exclusive with allow_promotion_codes: pre-apply a known code, otherwise let
      // the customer type one in manually.
      ...(promotionCodeId
        ? { discounts: [{ promotion_code: promotionCodeId }] }
        : { allow_promotion_codes: true }),
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    }),
  );
  if (!session.url) checkoutStopped("billing_unavailable");
  redirect(session.url);
}

/** Explicit opt-out after a stopped sticker checkout (e.g. the free month was already used):
 * clears the campaign so the visitor can choose the regular checkout themselves. The sticker
 * path itself never falls back to full price on its own. */
export async function dismissStickerOfferAction(): Promise<void> {
  await verifySession();
  (await cookies()).delete({ name: CAMPAIGN_COOKIE_NAME, path: "/" });
  redirect("/subscribe");
}

export async function createBillingPortalSessionAction(): Promise<void> {
  const { userId } = await verifySession();
  const siteUrl = await getSiteUrl();

  let portalUrl: string;
  try {
    const stripe = getStripeClient();
    const customerId = await getOrCreateStripeCustomer(userId);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/settings/billing`,
    });
    portalUrl = session.url;
  } catch (error) {
    console.error(`Billing portal unavailable: ${describeStripeError(error)}.`);
    redirect("/settings/billing?notice=portal_unavailable");
  }
  redirect(portalUrl);
}
