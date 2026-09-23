/** First-party attribution for the printed QR sticker (fitretro.app/promo1). Deliberately a
 * single hardcoded campaign, not a campaign-management system: /promo1 sets the cookie, and
 * checkout reads it to auto-apply the free-month promotion and tag the Stripe records. */
export const CAMPAIGN_COOKIE_NAME = "fr_campaign";

export const STICKER_CAMPAIGN = "promo1";

/** Added to both the Checkout Session and the subscription, so the campaign is visible on every
 * Stripe record created through the sticker. */
export const STICKER_CAMPAIGN_METADATA = {
  campaign: STICKER_CAMPAIGN,
  acquisition_source: "sticker",
} as const;

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

export function campaignCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Same rule as the session cookie (src/lib/session.ts): Secure in production unless the
    // deployment is explicitly plain-HTTP, where browsers would silently drop a Secure cookie.
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: THIRTY_DAYS_IN_SECONDS,
  };
}

/** Only the known sticker campaign counts — any other cookie value is treated as no campaign,
 * so a hand-edited cookie can't invent new attribution. */
export function parseCampaign(value: string | undefined): typeof STICKER_CAMPAIGN | null {
  return value === STICKER_CAMPAIGN ? STICKER_CAMPAIGN : null;
}
