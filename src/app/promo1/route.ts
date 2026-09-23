import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";
import {
  CAMPAIGN_COOKIE_NAME,
  STICKER_CAMPAIGN,
  campaignCookieOptions,
} from "@/features/billing/campaign";

/** Target of the printed QR sticker. Records the campaign in a first-party cookie, then hands off
 * to the existing flow: signed-in visitors go straight to /subscribe, everyone else signs up
 * first and is returned to /subscribe afterward. The session check here is only the same
 * optimistic one src/proxy.ts does — /subscribe itself still enforces verifySession(). */
export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get("session")?.value);
  const destination = session?.userId ? "/subscribe" : "/signup?next=%2Fsubscribe";

  const response = NextResponse.redirect(new URL(destination, request.nextUrl));
  response.cookies.set(CAMPAIGN_COOKIE_NAME, STICKER_CAMPAIGN, campaignCookieOptions());
  // The redirect target depends on the visitor's session, so it must never be cached.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
