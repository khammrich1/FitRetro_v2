import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazy singleton, same pattern as the Anthropic client elsewhere — throws only when billing is
 * actually invoked without STRIPE_SECRET_KEY set, not at import/build time, so the rest of the
 * app keeps working without it configured. */
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Set it in .env to enable billing.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
