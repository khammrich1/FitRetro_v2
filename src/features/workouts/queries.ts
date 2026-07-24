import { and, eq, asc, desc, gte, lt, lte, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import {
  workouts,
  workoutExercises,
  workoutSets,
  exercises,
  workoutSplitCycleDays,
  workoutSplitCycleCompletions,
  workoutTemplates,
  workoutTemplateExercises,
  type NewWorkout,
  type MuscleGroup,
  type WorkoutTemplate,
  type WorkoutTemplateExercise,
  type WorkoutSplitCycleDay,
} from "@/db/schema";
import { lbsToKg } from "./units";

export type WorkoutTemplateWithExercises = WorkoutTemplate & {
  exercises: WorkoutTemplateExercise[];
};

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

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

export async function getSplitCycleForUser(userId: string): Promise<WorkoutSplitCycleDay[]> {
  return db
    .select()
    .from(workoutSplitCycleDays)
    .where(eq(workoutSplitCycleDays.userId, userId))
    .orderBy(asc(workoutSplitCycleDays.sortOrder));
}

export async function addSplitCycleDay(userId: string, label: string, muscleGroups: MuscleGroup[]) {
  const siblings = await db
    .select({ sortOrder: workoutSplitCycleDays.sortOrder })
    .from(workoutSplitCycleDays)
    .where(eq(workoutSplitCycleDays.userId, userId));
  const nextSortOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

  const [day] = await db
    .insert(workoutSplitCycleDays)
    .values({ userId, sortOrder: nextSortOrder, label, muscleGroups })
    .returning();
  return day;
}

export async function updateSplitCycleDay(
  id: string,
  userId: string,
  input: { label: string; muscleGroups: MuscleGroup[] },
) {
  const [day] = await db
    .update(workoutSplitCycleDays)
    .set(input)
    .where(and(eq(workoutSplitCycleDays.id, id), eq(workoutSplitCycleDays.userId, userId)))
    .returning();
  return day ?? null;
}

export async function deleteSplitCycleDay(id: string, userId: string) {
  await db
    .delete(workoutSplitCycleDays)
    .where(and(eq(workoutSplitCycleDays.id, id), eq(workoutSplitCycleDays.userId, userId)));
}

export async function moveSplitCycleDay(
  id: string,
  userId: string,
  direction: "up" | "down",
): Promise<void> {
  const [day] = await db
    .select()
    .from(workoutSplitCycleDays)
    .where(and(eq(workoutSplitCycleDays.id, id), eq(workoutSplitCycleDays.userId, userId)));
  if (!day) return;

  const siblings = await db
    .select()
    .from(workoutSplitCycleDays)
    .where(eq(workoutSplitCycleDays.userId, userId))
    .orderBy(asc(workoutSplitCycleDays.sortOrder));

  const index = siblings.findIndex((sibling) => sibling.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const swapWith = siblings[swapIndex];
  await db.transaction(async (tx) => {
    await tx
      .update(workoutSplitCycleDays)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(workoutSplitCycleDays.id, day.id));
    await tx
      .update(workoutSplitCycleDays)
      .set({ sortOrder: day.sortOrder })
      .where(eq(workoutSplitCycleDays.id, swapWith.id));
  });
}

export type SplitCycleTarget = WorkoutSplitCycleDay & { completedToday: boolean };

/** The rotation step that's "current" as of `day` — the step after whichever was most recently
 * marked done on or before `day`, or the first step if nothing's been marked done yet. Advancing
 * only happens via explicit completion, so rest/skipped days don't shift the sequence. */
export async function getSplitCycleTargetForDate(
  userId: string,
  day: Date,
): Promise<SplitCycleTarget | null> {
  const cycleDays = await getSplitCycleForUser(userId);
  if (cycleDays.length === 0) return null;

  const dayIso = toDateOnly(day);
  const [mostRecent] = await db
    .select({
      cycleDayId: workoutSplitCycleCompletions.cycleDayId,
      completedOn: workoutSplitCycleCompletions.completedOn,
    })
    .from(workoutSplitCycleCompletions)
    .innerJoin(
      workoutSplitCycleDays,
      eq(workoutSplitCycleCompletions.cycleDayId, workoutSplitCycleDays.id),
    )
    .where(
      and(
        eq(workoutSplitCycleDays.userId, userId),
        lte(workoutSplitCycleCompletions.completedOn, dayIso),
      ),
    )
    .orderBy(
      desc(workoutSplitCycleCompletions.completedOn),
      desc(workoutSplitCycleCompletions.createdAt),
    )
    .limit(1);

  let targetIndex = 0;
  if (mostRecent) {
    const completedIndex = cycleDays.findIndex((cycleDay) => cycleDay.id === mostRecent.cycleDayId);
    if (completedIndex !== -1) targetIndex = (completedIndex + 1) % cycleDays.length;
  }
  const target = cycleDays[targetIndex];

  const [doneToday] = await db
    .select()
    .from(workoutSplitCycleCompletions)
    .where(
      and(
        eq(workoutSplitCycleCompletions.cycleDayId, target.id),
        eq(workoutSplitCycleCompletions.completedOn, dayIso),
      ),
    );

  return { ...target, completedToday: Boolean(doneToday) };
}

/** Toggles completion of the current rotation target for `day`. If it was already completed for
 * `day`, un-marks it (moving the rotation back); otherwise marks it done (advancing the rotation
 * for subsequent days). Returns the new completed state, or null if there's no cycle defined. */
export async function toggleSplitCycleCompletion(
  userId: string,
  day: Date,
): Promise<boolean | null> {
  const target = await getSplitCycleTargetForDate(userId, day);
  if (!target) return null;

  const dayIso = toDateOnly(day);
  if (target.completedToday) {
    await db
      .delete(workoutSplitCycleCompletions)
      .where(
        and(
          eq(workoutSplitCycleCompletions.cycleDayId, target.id),
          eq(workoutSplitCycleCompletions.completedOn, dayIso),
        ),
      );
    return false;
  }

  await db
    .insert(workoutSplitCycleCompletions)
    .values({ cycleDayId: target.id, completedOn: dayIso });
  return true;
}

export type TemplateExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup;
  targetSetsReps: string;
};

/** Creates a new template, or (when `templateId` is given) replaces an existing one's exercises. */
export async function saveTemplate(
  userId: string,
  input: { templateId?: string; name: string; exercises: TemplateExerciseInput[] },
) {
  return db.transaction(async (tx) => {
    let templateId = input.templateId;

    if (templateId) {
      const [updated] = await tx
        .update(workoutTemplates)
        .set({ name: input.name })
        .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)))
        .returning();
      if (!updated) throw new Error("Template not found.");
      await tx
        .delete(workoutTemplateExercises)
        .where(eq(workoutTemplateExercises.templateId, templateId));
    } else {
      const [created] = await tx
        .insert(workoutTemplates)
        .values({ userId, name: input.name })
        .returning();
      templateId = created.id;
    }

    if (input.exercises.length > 0) {
      await tx.insert(workoutTemplateExercises).values(
        input.exercises.map((exercise, sortOrder) => ({
          templateId: templateId!,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          targetSetsReps: exercise.targetSetsReps,
          sortOrder,
        })),
      );
    }

    return templateId;
  });
}

export async function deleteTemplate(id: string, userId: string) {
  await db
    .delete(workoutTemplates)
    .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)));
}

/** All of a user's saved templates, each with its ordered exercise list. */
export async function getTemplatesForUser(userId: string) {
  const templates = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .orderBy(asc(workoutTemplates.createdAt));

  const exercisesByTemplate = await Promise.all(
    templates.map((template) =>
      db
        .select()
        .from(workoutTemplateExercises)
        .where(eq(workoutTemplateExercises.templateId, template.id))
        .orderBy(asc(workoutTemplateExercises.sortOrder)),
    ),
  );

  return templates.map((template, i) => ({ ...template, exercises: exercisesByTemplate[i] }));
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
