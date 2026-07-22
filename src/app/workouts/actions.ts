"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  logWorkoutWithExercises,
  deleteWorkout,
  upsertSplitDay,
  deleteSplitDay,
  estimateWorkoutFromDescription,
  suggestExercisesForMuscleGroups,
  saveTemplate,
  deleteTemplate,
  estimateTemplateFromDescription,
  type WorkoutEstimate,
  type ExerciseSuggestion,
  type TemplateEstimate,
} from "@/features/workouts";
import { muscleGroupEnum } from "@/db/schema";

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
    startedAt: new Date(),
    notes: validatedFields.data.notes ?? null,
    exercises,
  });

  revalidatePath("/workouts");
}

export async function deleteWorkoutAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteWorkout(id, userId);
  revalidatePath("/workouts");
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

const splitDaySchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  muscleGroups: z.array(z.enum(muscleGroupEnum.enumValues)).min(1, "Pick at least one group."),
});

export async function upsertSplitDayAction(dayOfWeek: number, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = splitDaySchema.safeParse({
    label: formData.get("label"),
    muscleGroups: formData.getAll("muscleGroups"),
  });
  if (!validatedFields.success) return;

  await upsertSplitDay(
    userId,
    dayOfWeek,
    validatedFields.data.label,
    validatedFields.data.muscleGroups,
  );
  revalidatePath("/workouts");
}

export async function deleteSplitDayAction(dayOfWeek: number): Promise<void> {
  const { userId } = await verifySession();
  await deleteSplitDay(userId, dayOfWeek);
  revalidatePath("/workouts");
}

export type SuggestionsState =
  { suggestions: ExerciseSuggestion[] } | { error: string } | undefined;

export async function getExerciseSuggestionsAction(
  muscleGroups: string[],
  notes?: string,
): Promise<SuggestionsState> {
  await verifySession();

  if (muscleGroups.length === 0) {
    return { error: "Set today's target muscle groups in the split schedule first." };
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
  revalidatePath("/workouts");
}

export async function deleteTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteTemplate(id, userId);
  revalidatePath("/workouts");
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
