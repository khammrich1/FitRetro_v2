import { eq, asc, desc, and, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { bodyMeasurements, type NewBodyMeasurement } from "@/db/schema";

export async function recordMeasurement(input: NewBodyMeasurement) {
  const [measurement] = await db.insert(bodyMeasurements).values(input).returning();
  return measurement;
}

export async function getMeasurementHistory(userId: string) {
  return db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, userId))
    .orderBy(asc(bodyMeasurements.recordedAt));
}

export type DayMeasurementValues = {
  weightKg?: number;
  waistCm?: number;
  bodyFatPercent?: number;
};

/** Local-midnight bounds of a "YYYY-MM-DD" day, matching how @/lib/date's toIsoDate labels a
 * recordedAt timestamp. */
function dayBounds(day: string) {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Sets the given values on the day's most recent measurement, or records a new one (at noon, so
 * it can't drift onto a neighbouring day) if there's none. Values left undefined are untouched —
 * a blank field means "not entered", never "erase". */
export async function upsertMeasurementForDay(
  userId: string,
  day: string,
  values: DayMeasurementValues,
) {
  const set = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as DayMeasurementValues;
  if (Object.keys(set).length === 0) return;

  const { start, end } = dayBounds(day);
  const [existing] = await db
    .select({ id: bodyMeasurements.id })
    .from(bodyMeasurements)
    .where(
      and(
        eq(bodyMeasurements.userId, userId),
        gte(bodyMeasurements.recordedAt, start),
        lt(bodyMeasurements.recordedAt, end),
      ),
    )
    .orderBy(desc(bodyMeasurements.recordedAt))
    .limit(1);

  if (existing) {
    await db.update(bodyMeasurements).set(set).where(eq(bodyMeasurements.id, existing.id));
  } else {
    await db
      .insert(bodyMeasurements)
      .values({ userId, recordedAt: new Date(`${day}T12:00:00`), ...set });
  }
}
