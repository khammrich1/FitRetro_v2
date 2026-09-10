import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { matchTrackedPath, logPageView } from "@/features/ops";

const protectedRoutes = ["/today", "/pantry", "/meal-prep", "/settings", "/wake-up", "/ops"];
const authRoutes = ["/login", "/signup"];

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.includes(path);

  const cookie = request.cookies.get("session")?.value;
  const session = await verifySessionToken(cookie);

  // First-party, server-side page view logging — never blocks the response, never logs a
  // query string, and only records paths on the fixed allowlist in features/ops.
  const trackedPath = matchTrackedPath(path);
  if (trackedPath) {
    event.waitUntil(logPageView(trackedPath, session?.userId ?? null));
  }

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isAuthRoute && session?.userId) {
    return NextResponse.redirect(new URL("/today", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
