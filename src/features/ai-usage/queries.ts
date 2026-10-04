import { and, eq, sql, sum } from "drizzle-orm";
import { db } from "@/db/client";
import { aiUsage } from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export async function getAiUsageCountForDay(userId: string, day: Date): Promise<number> {
  const dayIso = toDateOnly(day);
  const [row] = await db
    .select({ count: aiUsage.count })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, dayIso)));

  return row?.count ?? 0;
}

/** Reserves one of the user's `limit` AI actions for the day and returns the new count, or
 * null if the day is already full. Admission and increment are one statement: the insert
 * creates the day's row at 1, and on conflict the update only applies while the stored count is
 * still under the limit. Postgres serialises the row, so a burst of requests arriving at 19
 * sees exactly one succeed — a read-then-increment would have let them all through. */
export async function reserveAiUsage(
  userId: string,
  day: Date,
  limit: number,
): Promise<number | null> {
  const dayIso = toDateOnly(day);
  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day: dayIso, count: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: { count: sql`${aiUsage.count} + 1` },
      setWhere: sql`${aiUsage.count} < ${limit}`,
    })
    .returning({ count: aiUsage.count });

  return row?.count ?? null;
}

/** Every account's AI actions for the day added up — the input to the site-wide ceiling. */
export async function getAiUsageTotalForDay(day: Date): Promise<number> {
  const dayIso = toDateOnly(day);
  const [row] = await db
    .select({ total: sum(aiUsage.count) })
    .from(aiUsage)
    .where(eq(aiUsage.day, dayIso));
  return Number(row?.total ?? 0);
}
