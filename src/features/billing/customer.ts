import "server-only";
import { getStripeClient } from "@/lib/stripe";
import { getUserById, setUserStripeCustomerIdIfUnset } from "@/features/auth";

/** Returns the user's Stripe Customer ID, creating one on first use. The customer's metadata
 * carries userId so the webhook can map Stripe events back to a user without an extra DB
 * round-trip keyed on the Stripe customer ID.
 *
 * Two first-time checkouts can race here (double tap, two tabs). Two things keep that to one
 * customer: the Stripe call carries an idempotency key derived from the user id, so Stripe
 * returns the same customer to both; and the id is written only if the account has none yet,
 * so whichever write lands first is the one kept and the other caller adopts it. */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: user.displayName,
      metadata: { userId },
    },
    { idempotencyKey: `customer-create:${userId}` },
  );

  const stored = await setUserStripeCustomerIdIfUnset(userId, customer.id);
  return stored ?? customer.id;
}
