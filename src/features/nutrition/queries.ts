import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import {
  nutritionEntries,
  nutritionGoals,
  type NewNutritionEntry,
  type NewNutritionGoal,
} from "@/db/schema";

export async function logNutritionEntry(input: NewNutritionEntry) {
  const [entry] = await db.insert(nutritionEntries).values(input).returning();
  return entry;
}

export async function updateNutritionEntry(
  id: string,
  userId: string,
  input: Omit<NewNutritionEntry, "id" | "userId" | "loggedAt">,
) {
  const [entry] = await db
    .update(nutritionEntries)
    .set(input)
    .where(and(eq(nutritionEntries.id, id), eq(nutritionEntries.userId, userId)))
    .returning();
  return entry ?? null;
}

export async function deleteNutritionEntry(id: string, userId: string) {
  await db
    .delete(nutritionEntries)
    .where(and(eq(nutritionEntries.id, id), eq(nutritionEntries.userId, userId)));
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

export async function getGoals(userId: string) {
  const [goal] = await db.select().from(nutritionGoals).where(eq(nutritionGoals.userId, userId));
  return goal ?? null;
}

export async function upsertGoals(input: NewNutritionGoal) {
  const [goal] = await db
    .insert(nutritionGoals)
    .values(input)
    .onConflictDoUpdate({
      target: nutritionGoals.userId,
      set: {
        dailyCalories: input.dailyCalories,
        dailyProteinGrams: input.dailyProteinGrams,
        dailyCarbsGrams: input.dailyCarbsGrams,
        dailyFatGrams: input.dailyFatGrams,
        updatedAt: new Date(),
      },
    })
    .returning();
  return goal;
}

export type RemainingMacros = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

/** Daily goals minus what's already been logged today; negative values mean the goal was exceeded. */
export async function getRemainingMacrosForDay(
  userId: string,
  day: Date,
): Promise<RemainingMacros | null> {
  const goal = await getGoals(userId);
  if (!goal) return null;

  const entries = await getEntriesForDay(userId, day);
  const consumed = summarizeMacros(entries);

  return {
    calories: goal.dailyCalories - consumed.calories,
    proteinGrams: goal.dailyProteinGrams - consumed.proteinGrams,
    carbsGrams: goal.dailyCarbsGrams - consumed.carbsGrams,
    fatGrams: goal.dailyFatGrams - consumed.fatGrams,
  };
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
