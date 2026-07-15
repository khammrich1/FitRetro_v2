import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { habits, habitLogs, type NewHabit } from "@/db/schema";

const POINTS_PER_COMPLETION = 10;

export async function createHabit(input: NewHabit) {
  const [habit] = await db.insert(habits).values(input).returning();
  return habit;
}

export async function getHabitsForUser(userId: string) {
  return db.select().from(habits).where(eq(habits.userId, userId));
}

/**
 * Marks a habit complete for the given day, then updates streak and points.
 * Assumes `completedOn` days are only ever logged once per habit (checked below)
 * and that the caller passes consecutive calendar days to advance the streak.
 */
export async function logHabitCompletion(habitId: string, completedOn: string) {
  const existing = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.completedOn, completedOn)));

  if (existing.length > 0) {
    return existing[0];
  }

  const [log] = await db.insert(habitLogs).values({ habitId, completedOn }).returning();

  await db
    .update(habits)
    .set({
      currentStreak: sql`${habits.currentStreak} + 1`,
      longestStreak: sql`greatest(${habits.longestStreak}, ${habits.currentStreak} + 1)`,
      points: sql`${habits.points} + ${POINTS_PER_COMPLETION}`,
    })
    .where(eq(habits.id, habitId));

  return log;
}

export async function resetHabitStreak(habitId: string) {
  await db.update(habits).set({ currentStreak: 0 }).where(eq(habits.id, habitId));
}
