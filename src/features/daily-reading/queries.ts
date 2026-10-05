import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyReadings, dailyReadingJobs, type DailyReading } from "@/db/schema";
import type { ReadingTopicKey } from "@/lib/reading-topics";
import { getAiUsageTotalForDay, globalDailyAiLimit } from "@/features/ai-usage";
import { generateDailyReading } from "./generate";

/** How long a claim on a (day, topic) generation is honoured before another request may take it
 * over. Long enough for a slow generation to finish; short enough that a crashed attempt
 * doesn't block the topic for the day. */
export const READING_JOB_LEASE_MINUTES = 10;

/** Claims the right to generate this (day, topic). One statement: insert the claim, or take over
 * an existing one only if its lease has expired. Returns true only for the caller that now
 * holds the lease, so concurrent cache misses produce one generation, not one each. */
export async function claimReadingJob(dayIso: string, topic: ReadingTopicKey): Promise<boolean> {
  const lease = sql`make_interval(mins => ${READING_JOB_LEASE_MINUTES})`;
  const rows = await db
    .insert(dailyReadingJobs)
    .values({ day: dayIso, topic, claimedAt: new Date() })
    .onConflictDoUpdate({
      target: [dailyReadingJobs.day, dailyReadingJobs.topic],
      set: { claimedAt: sql`now()` },
      setWhere: sql`${dailyReadingJobs.claimedAt} < now() - ${lease}`,
    })
    .returning({ id: dailyReadingJobs.id });
  return rows.length > 0;
}

/** Read-only — never generates. Used for both the current day (after generateAndCacheReading,
 * scheduled via next/server's after(), has had a chance to run on some earlier request) and past
 * days, which never generate retroactively but may already have a cached row from whenever a
 * user's rotation last landed on this exact (day, topic). */
export async function getReadingForDayAndTopic(
  dayIso: string,
  topic: ReadingTopicKey | null,
): Promise<DailyReading | null> {
  if (!topic) return null;
  const [row] = await db
    .select()
    .from(dailyReadings)
    .where(and(eq(dailyReadings.day, dayIso), eq(dailyReadings.topic, topic)));
  return row ?? null;
}

/** Generates and caches one day's reading for one topic, if it doesn't already exist. Meant to
 * be scheduled via next/server's after() rather than awaited directly, so a cache miss never
 * blocks the response that triggered it — errors are caught and logged rather than thrown, since
 * by the time this runs there's no request left to fail.
 *
 * Paid work happens only after claiming the (day, topic) lease, so however many requests see
 * the same cache miss at once, exactly one generates; the rest return immediately and the next
 * page load finds the cached row. It also respects the site-wide daily AI ceiling. */
export async function generateAndCacheReading(
  dayIso: string,
  topic: ReadingTopicKey,
): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: dailyReadings.id })
      .from(dailyReadings)
      .where(and(eq(dailyReadings.day, dayIso), eq(dailyReadings.topic, topic)));
    if (existing) return;

    if (!(await claimReadingJob(dayIso, topic))) return;

    const total = await getAiUsageTotalForDay(new Date());
    if (total >= globalDailyAiLimit()) {
      console.error(`Daily reading for "${topic}" skipped: site-wide AI limit reached (${total})`);
      return;
    }

    const { title, body, readMinutes } = await generateDailyReading(topic);
    // The lease makes a duplicate insert all but impossible; onConflictDoNothing is the last
    // line of defence if a lease ever expires mid-generation and a second attempt finishes
    // first — whichever loses just doesn't insert.
    await db
      .insert(dailyReadings)
      .values({ day: dayIso, topic, title, body, readMinutes })
      .onConflictDoNothing({ target: [dailyReadings.day, dailyReadings.topic] });
  } catch (error) {
    console.error(`Failed to generate daily reading for topic "${topic}" on ${dayIso}:`, error);
  }
}
