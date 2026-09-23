"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type Stripe from "stripe";
import { verifySession } from "@/features/auth";
import {
  CAMPAIGN_COOKIE_NAME,
  STICKER_CAMPAIGN_METADATA,
  getOrCreateStripeCustomer,
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

/** Why a sticker checkout was stopped — /subscribe maps each code to a fixed message. */
export type StickerCheckoutError = "promo_unavailable" | "promo_rejected";

/** Type/code only, never the message: Stripe error messages can echo a masked fragment of the
 * API key (e.g. on authentication failures). */
function describeStripeError(error: unknown): string {
  if (error && typeof error === "object") {
    const { type, code } = error as { type?: unknown; code?: unknown };
    const parts = [type, code].filter((part): part is string => typeof part === "string");
    if (parts.length > 0) return parts.join("/");
  }
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

function stickerCheckoutStopped(reason: StickerCheckoutError): never {
  redirect(`/subscribe?error=${reason}`);
}

export async function createCheckoutSessionAction(promoCode?: string): Promise<void> {
  const { userId } = await verifySession();
  const campaign = parseCampaign((await cookies()).get(CAMPAIGN_COOKIE_NAME)?.value);
  const stripe = getStripeClient();
  const priceId = getStripePriceId();
  const siteUrl = await getSiteUrl();

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
    if (!promotionCodeId) stickerCheckoutStopped("promo_unavailable");

    const customerId = await getOrCreateStripeCustomer(userId);
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
      // e.g. the code's restrictions exclude this customer. No session exists, so nothing can
      // be charged — surface it instead of an error page.
      console.error(
        `Sticker checkout stopped: Stripe rejected the session (${describeStripeError(error)}).`,
      );
      stickerCheckoutStopped("promo_rejected");
    }
    if (!checkoutUrl) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    redirect(checkoutUrl);
  }

  const customerId = await getOrCreateStripeCustomer(userId);
  const promotionCodeId = promoCode ? await findActivePromotionCodeId(promoCode) : null;

  const session = await stripe.checkout.sessions.create({
    ...baseParams,
    customer: customerId,
    // Mutually exclusive with allow_promotion_codes: pre-apply a known code, otherwise let the
    // customer type one in manually.
    ...(promotionCodeId
      ? { discounts: [{ promotion_code: promotionCodeId }] }
      : { allow_promotion_codes: true }),
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }
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
  const stripe = getStripeClient();
  const siteUrl = await getSiteUrl();
  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/settings/billing`,
  });

  redirect(session.url);
}
