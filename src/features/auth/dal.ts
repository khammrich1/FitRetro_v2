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

/** Gate for admin-only pages/actions — 404s (rather than redirecting) so the page's existence
 * isn't revealed to non-admins. */
export const requireAdmin = cache(async () => {
  const { userId } = await verifySession();
  const user = await getUserById(userId);
  if (!user?.isAdmin) {
    notFound();
  }
  return { userId, user };
});
