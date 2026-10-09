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

/** `ai_usage.count` is a Postgres `integer`; a limit outside its range fails at bind time
 * (SQLSTATE 22003), which is exactly how the owner's old MAX_SAFE_INTEGER sentinel took every
 * AI action down. Refuse such a limit here, before any statement is sent. */
const PG_INTEGER_MAX = 2_147_483_647;

/** Reserves one of the user's `limit` AI actions for the day and returns the new count, or
 * null if the day is already full. Admission and increment are one statement: the insert
 * creates the day's row at 1, and on conflict the update only applies while the stored count is
 * still under the limit. Postgres serialises the row, so a burst of requests arriving at 19
 * sees exactly one succeed — a read-then-increment would have let them all through.
 *
 * `limit: null` means no per-user cap (the owner): the action is still counted, so the
 * site-wide total stays honest, but the update carries no limit predicate at all rather than a
 * sentinel number. */
export async function reserveAiUsage(
  userId: string,
  day: Date,
  limit: number | null,
): Promise<number | null> {
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > PG_INTEGER_MAX)) {
    throw new RangeError(
      `AI usage limit must be an integer between 1 and ${PG_INTEGER_MAX}, got ${limit}`,
    );
  }
  const dayIso = toDateOnly(day);
  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day: dayIso, count: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: { count: sql`${aiUsage.count} + 1` },
      ...(limit === null ? {} : { setWhere: sql`${aiUsage.count} < ${limit}` }),
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
