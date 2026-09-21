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

export default async function BillingSettingsPage() {
  const { userId } = await verifySession();
  const subscription = await getSubscriptionForUser(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Billing</h1>

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
              <button
                type="submit"
                className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover"
              >
                Manage billing
              </button>
            </form>
          </>
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
