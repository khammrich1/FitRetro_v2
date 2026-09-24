import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getSubscriptionForUser } from "@/features/billing";
import { createBillingPortalSessionAction } from "@/app/billing/actions";
import type { SubscriptionStatus } from "@/db/schema";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete (expired)",
  paused: "Paused",
};

const MANAGE_BILLING_BUTTON_CLASS =
  "retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover";

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { userId } = await verifySession();
  const subscription = await getSubscriptionForUser(userId);
  // Set by checkout when Stripe itself reports a live subscription — which can be true even
  // before the webhook has written the local row below.
  const { notice } = await searchParams;
  const alreadySubscribed = notice === "already_subscribed";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Billing</h1>

      {notice === "portal_unavailable" && (
        <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
          Billing management couldn&apos;t be opened right now. Please try again in a moment.
        </p>
      )}

      {alreadySubscribed && (
        <p role="status" className="rounded-md border border-accent px-3 py-2 text-sm text-accent">
          You already have a FitRetro subscription, so no new checkout was started. Use Manage
          billing to view or change it.
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        {subscription ? (
          <>
            <p className="text-sm">
              Status:{" "}
              <span className="font-medium text-accent">{STATUS_LABELS[subscription.status]}</span>
            </p>
            {subscription.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            )}
            <form action={createBillingPortalSessionAction}>
              <button type="submit" className={MANAGE_BILLING_BUTTON_CLASS}>
                Manage billing
              </button>
            </form>
          </>
        ) : alreadySubscribed ? (
          <form action={createBillingPortalSessionAction}>
            <button type="submit" className={MANAGE_BILLING_BUTTON_CLASS}>
              Manage billing
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">No subscription yet.</p>
            <Link
              href="/subscribe"
              className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover"
            >
              Subscribe
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
