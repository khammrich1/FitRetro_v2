import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { nutritionEntries, type NewNutritionEntry } from "@/db/schema";

export async function logNutritionEntry(input: NewNutritionEntry) {
  const [entry] = await db.insert(nutritionEntries).values(input).returning();
  return entry;
}

/** Returns all entries logged for the given user on the calendar day of `day`. */
export async function getEntriesForDay(userId: string, day: Date) {
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  return db
    .select()
    .from(nutritionEntries)
    .where(
      and(
        eq(nutritionEntries.userId, userId),
        gte(nutritionEntries.loggedAt, startOfDay),
        lt(nutritionEntries.loggedAt, startOfNextDay),
      ),
    );
}

export function summarizeMacros(
  entries: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number }[],
) {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      proteinGrams: totals.proteinGrams + entry.proteinGrams,
      carbsGrams: totals.carbsGrams + entry.carbsGrams,
      fatGrams: totals.fatGrams + entry.fatGrams,
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );
}
