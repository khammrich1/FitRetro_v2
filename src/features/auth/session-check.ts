import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

/** The account's current session version, or null if the account no longer exists. Kept in its
 * own tiny module so tests that exercise the real session verification can fake just this. */
export async function getSessionVersion(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.sessionVersion ?? null;
}

/** Invalidates every session the account has, returning the new version so the device that
 * asked can be issued a fresh cookie and stay signed in. */
export async function bumpSessionVersion(userId: string): Promise<number | null> {
  const [row] = await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ sessionVersion: users.sessionVersion });
  return row?.sessionVersion ?? null;
}
