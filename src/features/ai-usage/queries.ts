import { and, eq, sql } from "drizzle-orm";
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

/** Atomically increments today's count and returns the new total. */
export async function incrementAiUsage(userId: string, day: Date): Promise<number> {
  const dayIso = toDateOnly(day);
  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day: dayIso, count: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: { count: sql`${aiUsage.count} + 1` },
    })
    .returning({ count: aiUsage.count });

  return row.count;
}
