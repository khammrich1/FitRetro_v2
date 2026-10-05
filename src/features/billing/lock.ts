import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/** Runs `work` while holding a per-user lock, so two checkouts for the same account can't
 * interleave their expire-old-sessions → check-subscriptions → create-session steps and both end
 * up with a payable session. A transaction-scoped Postgres advisory lock: nothing to clean up,
 * released the moment the transaction ends (including when `work` throws, which is how Next's
 * redirect() leaves a server action). The lock is only ever held for one checkout's worth of
 * Stripe calls, bounded by the client's 10s timeout. */
export async function withCheckoutLock<T>(userId: string, work: () => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`checkout:${userId}`}))`);
    return work();
  });
}
