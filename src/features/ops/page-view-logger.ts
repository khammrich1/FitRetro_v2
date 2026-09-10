import { db } from "@/db/client";
import { pageViews } from "@/db/schema";
import { toIsoDate } from "@/lib/date";

/** The only paths recorded — a fixed allowlist, not a catch-all. Keeps page_views free of
 * static assets, API internals, and anything not worth aggregating on /ops. */
export const TRACKED_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/today",
  "/settings",
  "/pantry",
  "/meal-prep",
  "/wake-up",
  "/ops",
  "/help",
  "/feedback",
  "/calendar",
] as const;

/** Maps an incoming pathname to one of the tracked prefixes, or null if it isn't tracked.
 * "/" only matches the bare root — every other prefix matches itself and its sub-paths, so
 * e.g. "/settings/nutrition" is recorded as "/settings". */
export function matchTrackedPath(pathname: string): string | null {
  if (pathname === "/") return "/";
  for (const prefix of TRACKED_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return prefix;
  }
  return null;
}

/** Server-side page view log, called from src/proxy.ts — never a client analytics SDK. Never
 * pass a full URL or search string in; `path` must already be the matched prefix. */
export async function logPageView(path: string, userId: string | null): Promise<void> {
  await db.insert(pageViews).values({ path, userId, day: toIsoDate(new Date()) });
}
