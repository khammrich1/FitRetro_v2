import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "./queries";
import { getSessionVersion } from "./session-check";

/** The signed-in user's id, or null. Checks both the cookie's signature and that its session
 * version still matches the account's — a password reset or "log out everywhere" bumps the
 * account's version, so every cookie issued before it stops working here at once, and a cookie
 * for a deleted account fails the same way. Cached per request. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  if (!session?.userId) return null;
  const current = await getSessionVersion(session.userId);
  if (current === null || current !== (session.sv ?? 1)) return null;
  return session.userId;
});

export const verifySession = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) {
    // A cookie that's present but no longer valid (sessions revoked, account gone) has to be
    // cleared, or proxy.ts — which only checks the signature — would bounce /login straight back
    // here. Cookies can't change during render, so /session/expired does it and then goes to
    // login with an explanation.
    const staleCookie = Boolean((await getSession())?.userId);
    redirect(staleCookie ? "/session/expired" : "/login");
  }
  return { userId };
});

export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getUserById(userId);
});

/** True only for the single account named by OWNER_EMAIL — not a general admin/role concept. */
export function isOwner(email: string) {
  if (!process.env.OWNER_EMAIL) return false;
  return email.toLowerCase() === process.env.OWNER_EMAIL.toLowerCase();
}

/** Gate for pages meant for the site owner alone — 404s (rather than redirecting) so the
 * page's existence isn't revealed to other accounts. */
export const requireOwner = cache(async () => {
  const { userId } = await verifySession();
  const user = await getUserById(userId);
  if (!user || !isOwner(user.email)) {
    notFound();
  }
  return { userId, user };
});
