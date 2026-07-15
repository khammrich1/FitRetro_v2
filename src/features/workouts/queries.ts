import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { workouts, workoutExercises, workoutSets, exercises, type NewWorkout } from "@/db/schema";

export async function createWorkout(input: NewWorkout) {
  const [workout] = await db.insert(workouts).values(input).returning();
  return workout;
}

export async function getWorkoutsForUser(userId: string) {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(asc(workouts.startedAt));
}

export async function getWorkoutDetail(workoutId: string) {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, workoutId));
  if (!workout) return null;

  const exerciseRows = await db
    .select({
      workoutExercise: workoutExercises,
      exercise: exercises,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.order));

  const setsByExercise = await Promise.all(
    exerciseRows.map((row) =>
      db
        .select()
        .from(workoutSets)
        .where(eq(workoutSets.workoutExerciseId, row.workoutExercise.id))
        .orderBy(asc(workoutSets.setNumber)),
    ),
  );

  return {
    workout,
    exercises: exerciseRows.map((row, i) => ({
      ...row.workoutExercise,
      exercise: row.exercise,
      sets: setsByExercise[i],
    })),
  };
}
