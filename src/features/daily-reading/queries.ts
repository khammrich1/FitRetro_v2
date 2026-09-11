import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyReadings, type DailyReading } from "@/db/schema";
import { toIsoDate } from "@/lib/date";
import type { ReadingTopicKey } from "@/lib/reading-topics";
import { generateDailyReading } from "./generate";

/** Whatever readings already exist for `day` among `topics` — read-only, generates nothing.
 * Used for both past days (which never generate retroactively) and as the final read after
 * ensureTodaysReadings has filled in anything missing. */
export async function getReadingsForDay(
  day: Date,
  topics: ReadingTopicKey[],
): Promise<DailyReading[]> {
  if (topics.length === 0) return [];
  const dayIso = toIsoDate(day);
  return db
    .select()
    .from(dailyReadings)
    .where(and(eq(dailyReadings.day, dayIso), inArray(dailyReadings.topic, topics)));
}

/** Generates today's reading for any of `topics` that don't have one yet, so the first person to
 * load Today each day pays the (few-second) generation cost and everyone after them just reads
 * the cached row. Only ever called for the actual current day — never for a day navigated to via
 * DayNav — since backfilling a reading for a past day that never had one doesn't make sense. */
export async function ensureTodaysReadings(topics: ReadingTopicKey[]): Promise<void> {
  if (topics.length === 0) return;

  const dayIso = toIsoDate(new Date());
  const existing = await db
    .select({ topic: dailyReadings.topic })
    .from(dailyReadings)
    .where(and(eq(dailyReadings.day, dayIso), inArray(dailyReadings.topic, topics)));

  const existingTopics = new Set(existing.map((row) => row.topic));
  const missingTopics = topics.filter((topic) => !existingTopics.has(topic));
  if (missingTopics.length === 0) return;

  await Promise.all(
    missingTopics.map(async (topic) => {
      // Generation failing (no API key, rate limit, a bad response) must never take down the
      // rest of /today — that topic's reading just stays missing for today and the next request
      // tries again.
      try {
        const { title, body, readMinutes } = await generateDailyReading(topic);
        // onConflictDoNothing guards the rare race where two requests both find this topic
        // missing at once — whichever loses just doesn't insert, since the winner's row already
        // satisfies the (day, topic) uniqueness the next read will find.
        await db
          .insert(dailyReadings)
          .values({ day: dayIso, topic, title, body, readMinutes })
          .onConflictDoNothing({ target: [dailyReadings.day, dailyReadings.topic] });
      } catch (error) {
        console.error(`Failed to generate daily reading for topic "${topic}":`, error);
      }
    }),
  );
}
