import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getSubscriptionForUser } from "@/features/billing";
import { createCheckoutSessionAction } from "@/app/billing/actions";

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string }>;
}) {
  const { userId } = await verifySession();
  const { promo } = await searchParams;
  const subscription = await getSubscriptionForUser(userId);
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  const startCheckout = createCheckoutSessionAction.bind(null, promo);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Subscribe</h1>

      {isActive ? (
        <p className="text-sm text-muted-foreground">
          You already have an active subscription — manage it in{" "}
          <Link href="/settings/billing" className="text-accent underline">
            Settings &gt; Billing
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <div>
            <p className="text-3xl font-bold text-primary">
              $8<span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Everything in FitRetro, unlimited logging, cancel anytime.
            </p>
          </div>
          {promo && (
            <p className="rounded-md border border-accent bg-background px-3 py-2 text-sm text-accent">
              Free month code applied: {promo}
            </p>
          )}
          <form action={startCheckout}>
            <button
              type="submit"
              className="retro-glow w-full rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              {promo ? "Redeem free month" : "Start subscription"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
