import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { goals, type DatePrecision, type Goal } from "@/db/schema";
import type { GoalValues } from "./validation";

export async function listGoals(userId: string): Promise<Goal[]> {
  return db.select().from(goals).where(eq(goals.userId, userId));
}

export async function createGoal(userId: string, values: GoalValues): Promise<Goal> {
  const [goal] = await db
    .insert(goals)
    .values({ userId, ...values })
    .returning();
  return goal;
}

/** Every write below is scoped to the owner: a goal id belonging to someone else matches no row
 * and changes nothing. Each returns whether a row was changed. */
export async function updateGoal(goalId: string, userId: string, values: GoalValues) {
  const updated = await db
    .update(goals)
    .set(values)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .returning({ id: goals.id });
  return updated.length > 0;
}

export async function markGoalAchieved(
  goalId: string,
  userId: string,
  achievedOn: string,
  achievedPrecision: DatePrecision,
) {
  const updated = await db
    .update(goals)
    .set({ status: "achieved", achievedOn, achievedPrecision })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .returning({ id: goals.id });
  return updated.length > 0;
}

export async function getGoalForUser(goalId: string, userId: string): Promise<Goal | null> {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);
  return goal ?? null;
}

export async function deleteGoal(goalId: string, userId: string) {
  const deleted = await db
    .delete(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .returning({ id: goals.id });
  return deleted.length > 0;
}
