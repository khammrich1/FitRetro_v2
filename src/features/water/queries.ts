import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { waterIntake } from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

/** Today's (or `day`'s) water intake in ounces — 0 if nothing's been set for this day yet. */
export async function getWaterIntakeForDay(userId: string, day: Date): Promise<number> {
  const dayIso = toDateOnly(day);
  const [row] = await db
    .select({ ounces: waterIntake.ounces })
    .from(waterIntake)
    .where(and(eq(waterIntake.userId, userId), eq(waterIntake.day, dayIso)));

  return row?.ounces ?? 0;
}

export async function setWaterIntakeForDay(
  userId: string,
  day: Date,
  ounces: number,
): Promise<void> {
  const dayIso = toDateOnly(day);

  await db
    .insert(waterIntake)
    .values({ userId, day: dayIso, ounces })
    .onConflictDoUpdate({
      target: [waterIntake.userId, waterIntake.day],
      set: { ounces },
    });
}
