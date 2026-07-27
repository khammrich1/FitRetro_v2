import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "./queries";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return { userId: session.userId };
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  return getUserById(session.userId);
});

/** True only for the single account named by OWNER_EMAIL — not a general admin/role concept. */
export function isOwner(email: string) {
  return email === process.env.OWNER_EMAIL;
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
