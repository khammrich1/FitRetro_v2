import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyReadings, type DailyReading } from "@/db/schema";
import type { ReadingTopicKey } from "@/lib/reading-topics";
import { generateDailyReading } from "./generate";

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
 * by the time this runs there's no request left to fail. */
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

    const { title, body, readMinutes } = await generateDailyReading(topic);
    // onConflictDoNothing guards the rare race where two requests both find this topic missing
    // at once (e.g. two different users' rotations landing on it the same day, or a page reload
    // racing an in-flight generation) — whichever loses just doesn't insert, since the winner's
    // row already satisfies the (day, topic) uniqueness the next read will find.
    await db
      .insert(dailyReadings)
      .values({ day: dayIso, topic, title, body, readMinutes })
      .onConflictDoNothing({ target: [dailyReadings.day, dailyReadings.topic] });
  } catch (error) {
    console.error(`Failed to generate daily reading for topic "${topic}" on ${dayIso}:`, error);
  }
}
