import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/session";

/** Where verifySession() sends a request whose cookie is signed correctly but no longer valid —
 * its session version was revoked (password reset, "log out of all devices") or the account is
 * gone. A page can't change cookies while rendering, and leaving the dead cookie in place would
 * make proxy.ts (which only checks the signature) bounce /login straight back to /today. So this
 * clears it and lands on login with an explanation. */
export async function GET(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login?notice=session_expired", request.nextUrl), {
    headers: { "Cache-Control": "no-store" },
  });
}
