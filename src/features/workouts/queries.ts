import { and, eq, asc, gte, lt, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import {
  workouts,
  workoutExercises,
  workoutSets,
  exercises,
  workoutSplitDays,
  type NewWorkout,
  type MuscleGroup,
} from "@/db/schema";
import { lbsToKg } from "./units";

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

/** Finds an exercise in the shared catalog by name (case-insensitive), creating it if it's new. */
export async function getOrCreateExercise(name: string, muscleGroup: MuscleGroup) {
  const [existing] = await db.select().from(exercises).where(ilike(exercises.name, name));
  if (existing) return existing;

  const [created] = await db.insert(exercises).values({ name, muscleGroup }).returning();
  return created;
}

export type LoggedSetInput = {
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  rpe: number | null;
};

export type LoggedExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup;
  sets: LoggedSetInput[];
};

/** Creates a workout with its exercises and sets in one transaction, reusing the shared exercise catalog. */
export async function logWorkoutWithExercises(
  userId: string,
  input: { name: string; startedAt: Date; notes: string | null; exercises: LoggedExerciseInput[] },
) {
  return db.transaction(async (tx) => {
    const [workout] = await tx
      .insert(workouts)
      .values({
        userId,
        name: input.name,
        startedAt: input.startedAt,
        completedAt: input.startedAt,
        notes: input.notes,
      })
      .returning();

    for (let order = 0; order < input.exercises.length; order++) {
      const exerciseInput = input.exercises[order];
      const [existing] = await tx
        .select()
        .from(exercises)
        .where(ilike(exercises.name, exerciseInput.name));
      const exercise =
        existing ??
        (
          await tx
            .insert(exercises)
            .values({ name: exerciseInput.name, muscleGroup: exerciseInput.muscleGroup })
            .returning()
        )[0];

      const [workoutExercise] = await tx
        .insert(workoutExercises)
        .values({ workoutId: workout.id, exerciseId: exercise.id, order })
        .returning();

      if (exerciseInput.sets.length > 0) {
        await tx.insert(workoutSets).values(
          exerciseInput.sets.map((set, setNumber) => ({
            workoutExerciseId: workoutExercise.id,
            setNumber: setNumber + 1,
            reps: set.reps,
            weightKg: set.weightLbs !== null ? lbsToKg(set.weightLbs) : null,
            durationSeconds: set.durationSeconds,
            rpe: set.rpe,
          })),
        );
      }
    }

    return workout;
  });
}

/** All of a user's workouts logged on the calendar day of `day`, with exercises and sets. */
export async function getWorkoutsForDay(userId: string, day: Date) {
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.startedAt, startOfDay),
        lt(workouts.startedAt, startOfNextDay),
      ),
    )
    .orderBy(asc(workouts.startedAt));

  return Promise.all(dayWorkouts.map((workout) => getWorkoutDetail(workout.id)));
}

export async function deleteWorkout(id: string, userId: string) {
  await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, userId)));
}

export async function upsertSplitDay(
  userId: string,
  dayOfWeek: number,
  label: string,
  muscleGroups: MuscleGroup[],
) {
  const [splitDay] = await db
    .insert(workoutSplitDays)
    .values({ userId, dayOfWeek, label, muscleGroups })
    .onConflictDoUpdate({
      target: [workoutSplitDays.userId, workoutSplitDays.dayOfWeek],
      set: { label, muscleGroups },
    })
    .returning();
  return splitDay;
}

export async function deleteSplitDay(userId: string, dayOfWeek: number) {
  await db
    .delete(workoutSplitDays)
    .where(and(eq(workoutSplitDays.userId, userId), eq(workoutSplitDays.dayOfWeek, dayOfWeek)));
}

export async function getSplitForUser(userId: string) {
  return db
    .select()
    .from(workoutSplitDays)
    .where(eq(workoutSplitDays.userId, userId))
    .orderBy(asc(workoutSplitDays.dayOfWeek));
}

export async function getSplitDayForDate(userId: string, day: Date) {
  const [splitDay] = await db
    .select()
    .from(workoutSplitDays)
    .where(and(eq(workoutSplitDays.userId, userId), eq(workoutSplitDays.dayOfWeek, day.getDay())));
  return splitDay ?? null;
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
