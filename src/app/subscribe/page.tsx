import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/features/auth";
import { CAMPAIGN_COOKIE_NAME, getSubscriptionForUser, parseCampaign } from "@/features/billing";
import {
  createCheckoutSessionAction,
  dismissStickerOfferAction,
  type StickerCheckoutError,
} from "@/app/billing/actions";

const STICKER_ERROR_MESSAGES: Record<StickerCheckoutError, string> = {
  promo_unavailable:
    "The free-month sticker offer isn't available right now, so checkout was stopped before anything was charged. Please try again later.",
  promo_rejected:
    "Stripe couldn't apply the free-month sticker offer to your account (it may already have been used), so checkout was stopped before anything was charged.",
};

function isStickerError(value: string | undefined): value is StickerCheckoutError {
  return value !== undefined && Object.hasOwn(STICKER_ERROR_MESSAGES, value);
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string; error?: string }>;
}) {
  const { userId } = await verifySession();
  const { promo, error } = await searchParams;
  const subscription = await getSubscriptionForUser(userId);
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const hasStickerOffer =
    parseCampaign((await cookies()).get(CAMPAIGN_COOKIE_NAME)?.value) !== null;
  const stickerError = isStickerError(error) ? STICKER_ERROR_MESSAGES[error] : null;

  const startCheckout = createCheckoutSessionAction.bind(null, promo);
  const offersFreeMonth = hasStickerOffer || Boolean(promo);

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
          {stickerError && (
            <p
              role="alert"
              className="rounded-md border border-danger px-3 py-2 text-sm text-danger"
            >
              {stickerError}
            </p>
          )}
          {hasStickerOffer ? (
            <p className="rounded-md border border-accent bg-background px-3 py-2 text-sm text-accent">
              Sticker offer: your first month is free — applied automatically at checkout, then
              $8/month.
            </p>
          ) : (
            promo && (
              <p className="rounded-md border border-accent bg-background px-3 py-2 text-sm text-accent">
                Free month code applied: {promo}
              </p>
            )
          )}
          <form action={startCheckout}>
            <button
              type="submit"
              className="retro-glow w-full rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              {offersFreeMonth ? "Redeem free month" : "Start subscription"}
            </button>
          </form>
          {hasStickerOffer && stickerError && (
            <form action={dismissStickerOfferAction}>
              <button type="submit" className="w-full text-sm text-muted-foreground underline">
                Continue without the offer at the regular $8/month
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
