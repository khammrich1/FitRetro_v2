import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { bodyMeasurements, workouts, workoutExercises, workoutSets } from "@/db/schema";

/** Weight over time for charting, oldest first. */
export async function getWeightTrend(userId: string) {
  const rows = await db
    .select({ recordedAt: bodyMeasurements.recordedAt, weightKg: bodyMeasurements.weightKg })
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, userId))
    .orderBy(asc(bodyMeasurements.recordedAt));

  return rows.filter((row) => row.weightKg != null);
}

/** Total volume (reps * weight, summed across sets) per workout, oldest first. */
export async function getWorkoutVolumeTrend(userId: string) {
  const rows = await db
    .select({
      workoutId: workouts.id,
      startedAt: workouts.startedAt,
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
    })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(workoutSets, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(eq(workouts.userId, userId))
    .orderBy(asc(workouts.startedAt));

  const volumeByWorkout = new Map<string, { startedAt: Date; volume: number }>();
  for (const row of rows) {
    const entry = volumeByWorkout.get(row.workoutId) ?? { startedAt: row.startedAt, volume: 0 };
    entry.volume += (row.reps ?? 0) * (row.weightKg ?? 0);
    volumeByWorkout.set(row.workoutId, entry);
  }

  return Array.from(volumeByWorkout.entries())
    .map(([workoutId, data]) => ({ workoutId, ...data }))
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}
