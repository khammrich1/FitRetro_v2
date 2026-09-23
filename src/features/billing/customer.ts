import "server-only";
import { getStripeClient } from "@/lib/stripe";
import { getUserById, setUserStripeCustomerId } from "@/features/auth";

/** Returns the user's Stripe Customer ID, creating one on first use. The customer's metadata
 * carries userId so the webhook can map Stripe events back to a user without an extra DB
 * round-trip keyed on the Stripe customer ID. */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.displayName,
    metadata: { userId },
  });

  await setUserStripeCustomerId(userId, customer.id);
  return customer.id;
}
