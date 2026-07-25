"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  logWorkoutWithExercises,
  deleteWorkout,
  addSplitCycleDay,
  updateSplitCycleDay,
  deleteSplitCycleDay,
  moveSplitCycleDay,
  toggleSplitCycleCompletion,
  startWorkoutFromTemplate,
  updateWorkoutSet,
  addWorkoutSet,
  removeWorkoutSet,
  addWorkoutExercise,
  removeWorkoutExercise,
  updateWorkoutName,
  finishWorkout,
  estimateWorkoutFromDescription,
  suggestExercisesForMuscleGroups,
  saveTemplate,
  deleteTemplate,
  moveTemplate,
  estimateTemplateFromDescription,
  type WorkoutEstimate,
  type ExerciseSuggestion,
  type TemplateEstimate,
} from "@/features/workouts";
import { muscleGroupEnum, type MuscleGroup } from "@/db/schema";
import { parseDayParam } from "@/lib/date";

/** Combines a calendar day with the current time of day, so workouts logged for a non-today day
 * (e.g. backfilling yesterday) still get a sensible timestamp rather than midnight. */
function combineDayWithCurrentTime(dayIso: string | null): Date {
  const now = new Date();
  const day = parseDayParam(dayIso);
  day.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return day;
}

function revalidateWorkoutPaths() {
  revalidatePath("/today");
  revalidatePath("/settings/workouts");
}

const setSchema = z.object({
  reps: z.coerce.number().int().min(0).nullable(),
  weightLbs: z.coerce.number().min(0).nullable(),
  durationSeconds: z.coerce.number().int().min(0).nullable(),
  rpe: z.coerce.number().min(0).nullable(),
});

const exerciseSchema = z.object({
  name: z.string().trim().min(1),
  muscleGroup: z.enum(muscleGroupEnum.enumValues),
  sets: z.array(setSchema),
});

const exercisesSchema = z.array(exerciseSchema).min(1);

function parseLoggedExercises(raw: FormDataEntryValue | null): z.infer<typeof exercisesSchema> {
  if (typeof raw !== "string") return [];
  try {
    const result = exercisesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

const logWorkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  notes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional(),
  ),
});

export type LogWorkoutState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function logWorkoutAction(
  _state: LogWorkoutState,
  formData: FormData,
): Promise<LogWorkoutState> {
  const { userId } = await verifySession();

  const validatedFields = logWorkoutSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const exercises = parseLoggedExercises(formData.get("exercises"));
  if (exercises.length === 0) {
    return { errors: { exercises: ["Add at least one exercise."] } };
  }

  await logWorkoutWithExercises(userId, {
    name: validatedFields.data.name,
    startedAt: combineDayWithCurrentTime(formData.get("day")?.toString() ?? null),
    notes: validatedFields.data.notes ?? null,
    exercises,
  });

  revalidatePath("/today");
}

export async function deleteWorkoutAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteWorkout(id, userId);
  revalidatePath("/today");
}

export type EstimateWorkoutState = { estimate: WorkoutEstimate } | { error: string } | undefined;

export async function estimateWorkoutAction(description: string): Promise<EstimateWorkoutState> {
  await verifySession();

  if (!description.trim()) {
    return { error: "Describe your workout first." };
  }

  try {
    const estimate = await estimateWorkoutFromDescription(description);
    return { estimate };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to parse the workout." };
  }
}

const splitCycleDaySchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  muscleGroups: z.array(z.enum(muscleGroupEnum.enumValues)).min(1, "Pick at least one group."),
});

export type SplitCycleDayState = { errors?: Record<string, string[]> } | undefined;

export async function addSplitCycleDayAction(
  _state: SplitCycleDayState,
  formData: FormData,
): Promise<SplitCycleDayState> {
  const { userId } = await verifySession();

  const validatedFields = splitCycleDaySchema.safeParse({
    label: formData.get("label"),
    muscleGroups: formData.getAll("muscleGroups"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await addSplitCycleDay(userId, validatedFields.data.label, validatedFields.data.muscleGroups);
  revalidateWorkoutPaths();
}

export async function updateSplitCycleDayAction(id: string, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = splitCycleDaySchema.safeParse({
    label: formData.get("label"),
    muscleGroups: formData.getAll("muscleGroups"),
  });
  if (!validatedFields.success) return;

  await updateSplitCycleDay(id, userId, validatedFields.data);
  revalidateWorkoutPaths();
}

export async function deleteSplitCycleDayAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteSplitCycleDay(id, userId);
  revalidateWorkoutPaths();
}

export async function moveSplitCycleDayAction(id: string, direction: "up" | "down"): Promise<void> {
  const { userId } = await verifySession();
  await moveSplitCycleDay(id, userId, direction);
  revalidateWorkoutPaths();
}

export async function toggleSplitCycleCompletionAction(dayIso: string): Promise<void> {
  const { userId } = await verifySession();
  await toggleSplitCycleCompletion(userId, parseDayParam(dayIso));
  revalidatePath("/today");
}

export async function startWorkoutFromTemplateAction(
  templateId: string,
  dayIso: string,
): Promise<void> {
  const { userId } = await verifySession();
  await startWorkoutFromTemplate(userId, templateId, combineDayWithCurrentTime(dayIso));
  revalidatePath("/today");
}

export type WorkoutSetInput = {
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  rpe: number | null;
};

export async function updateWorkoutSetAction(setId: string, input: WorkoutSetInput): Promise<void> {
  const { userId } = await verifySession();
  await updateWorkoutSet(setId, userId, input);
  revalidatePath("/today");
}

export async function addWorkoutSetAction(workoutExerciseId: string): Promise<void> {
  const { userId } = await verifySession();
  await addWorkoutSet(workoutExerciseId, userId);
  revalidatePath("/today");
}

export async function removeWorkoutSetAction(setId: string): Promise<void> {
  const { userId } = await verifySession();
  await removeWorkoutSet(setId, userId);
  revalidatePath("/today");
}

export async function addWorkoutExerciseAction(
  workoutId: string,
  name: string,
  muscleGroup: MuscleGroup,
): Promise<void> {
  const { userId } = await verifySession();
  if (!name.trim()) return;
  await addWorkoutExercise(workoutId, userId, name.trim(), muscleGroup);
  revalidatePath("/today");
}

export async function removeWorkoutExerciseAction(workoutExerciseId: string): Promise<void> {
  const { userId } = await verifySession();
  await removeWorkoutExercise(workoutExerciseId, userId);
  revalidatePath("/today");
}

export async function updateWorkoutNameAction(workoutId: string, name: string): Promise<void> {
  const { userId } = await verifySession();
  if (!name.trim()) return;
  await updateWorkoutName(workoutId, userId, name.trim());
  revalidatePath("/today");
}

export async function finishWorkoutAction(workoutId: string): Promise<void> {
  const { userId } = await verifySession();
  await finishWorkout(workoutId, userId);
  revalidatePath("/today");
}

export type SuggestionsState =
  { suggestions: ExerciseSuggestion[] } | { error: string } | undefined;

export async function getExerciseSuggestionsAction(
  muscleGroups: string[],
  notes?: string,
): Promise<SuggestionsState> {
  await verifySession();

  if (muscleGroups.length === 0) {
    return { error: "Set up your workout rotation in Settings first." };
  }

  try {
    const suggestions = await suggestExercisesForMuscleGroups(muscleGroups, notes);
    return { suggestions };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to get exercise suggestions.",
    };
  }
}

const templateExerciseSchema = z.object({
  name: z.string().trim().min(1),
  muscleGroup: z.enum(muscleGroupEnum.enumValues),
  targetSetsReps: z.string().trim().min(1),
});

const templateExercisesSchema = z.array(templateExerciseSchema).min(1);

function parseTemplateExercises(
  raw: FormDataEntryValue | null,
): z.infer<typeof templateExercisesSchema> {
  if (typeof raw !== "string") return [];
  try {
    const result = templateExercisesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

const saveTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
});

export type SaveTemplateState = { errors?: Record<string, string[]> } | undefined;

export async function saveTemplateAction(
  templateId: string | undefined,
  _state: SaveTemplateState,
  formData: FormData,
): Promise<SaveTemplateState> {
  const { userId } = await verifySession();

  const validatedFields = saveTemplateSchema.safeParse({ name: formData.get("name") });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const exercises = parseTemplateExercises(formData.get("exercises"));
  if (exercises.length === 0) {
    return { errors: { exercises: ["Add at least one exercise."] } };
  }

  await saveTemplate(userId, { templateId, name: validatedFields.data.name, exercises });
  revalidateWorkoutPaths();
}

export async function deleteTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteTemplate(id, userId);
  revalidateWorkoutPaths();
}

export async function moveTemplateAction(id: string, direction: "up" | "down"): Promise<void> {
  const { userId } = await verifySession();
  await moveTemplate(id, userId, direction);
  revalidateWorkoutPaths();
}

export type EstimateTemplateState = { estimate: TemplateEstimate } | { error: string } | undefined;

export async function estimateTemplateAction(description: string): Promise<EstimateTemplateState> {
  await verifySession();

  if (!description.trim()) {
    return { error: "Describe your routine first." };
  }

  try {
    const estimate = await estimateTemplateFromDescription(description);
    return { estimate };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to parse the routine." };
  }
}
