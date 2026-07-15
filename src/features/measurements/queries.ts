import { eq, asc } from "drizzle-orm";
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
