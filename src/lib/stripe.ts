import "server-only";
import Stripe from "stripe";
import { isTestModeSecretKey } from "./stripe-mode";

/** The only place Stripe secrets are read. `server-only` makes any client-side import a build
 * error, so the secret key and webhook secret can never reach the browser bundle. Errors name
 * the missing variable, never its value. */
type ServerStripeVar = "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "STRIPE_PRICE_ID";

function requireEnv(name: ServerStripeVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured. Set it in .env to enable billing.`);
  }
  return value;
}

let client: Stripe | null = null;

/** Lazy, so the rest of the app works with billing unconfigured — this only throws when billing
 * is actually used. */
export function getStripeClient(): Stripe {
  if (!client) {
    const secretKey = requireEnv("STRIPE_SECRET_KEY");
    if (!isTestModeSecretKey(secretKey)) {
      throw new Error(
        "STRIPE_SECRET_KEY must be a test-mode key (sk_test_ or rk_test_). Billing runs in test mode only for now.",
      );
    }
    client = new Stripe(secretKey);
  }
  return client;
}

export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceId(): string {
  return requireEnv("STRIPE_PRICE_ID");
}

/** The human-readable promotion code the QR sticker promises (e.g. "FREEMONTH"). Not a secret,
 * but returns null instead of throwing: sticker checkout must turn a missing code into a clear
 * "offer unavailable" stop, never a crash or a full-price fallback. */
export function getStripePromoCode(): string | null {
  return process.env.STRIPE_PROMO_CODE?.trim() || null;
}
