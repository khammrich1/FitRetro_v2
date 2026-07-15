"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  logNutritionEntry,
  upsertGoals,
  getRemainingMacrosForDay,
  suggestFoodsForRemainingMacros,
  type FoodSuggestion,
} from "@/features/nutrition";
import { mealTypeEnum } from "@/db/schema";

const logMealSchema = z.object({
  mealType: z.enum(mealTypeEnum.enumValues),
  description: z.string().trim().min(1, "Description is required."),
  calories: z.coerce.number().int().min(0),
  proteinGrams: z.coerce.number().min(0),
  carbsGrams: z.coerce.number().min(0),
  fatGrams: z.coerce.number().min(0),
});

export type LogMealState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function logMealAction(
  _state: LogMealState,
  formData: FormData,
): Promise<LogMealState> {
  const { userId } = await verifySession();

  const validatedFields = logMealSchema.safeParse({
    mealType: formData.get("mealType"),
    description: formData.get("description"),
    calories: formData.get("calories"),
    proteinGrams: formData.get("proteinGrams"),
    carbsGrams: formData.get("carbsGrams"),
    fatGrams: formData.get("fatGrams"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await logNutritionEntry({
    userId,
    loggedAt: new Date(),
    ...validatedFields.data,
  });

  revalidatePath("/nutrition");
}

const goalsSchema = z.object({
  dailyCalories: z.coerce.number().int().min(0),
  dailyProteinGrams: z.coerce.number().min(0),
  dailyCarbsGrams: z.coerce.number().min(0),
  dailyFatGrams: z.coerce.number().min(0),
});

export type GoalsState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function setGoalsAction(_state: GoalsState, formData: FormData): Promise<GoalsState> {
  const { userId } = await verifySession();

  const validatedFields = goalsSchema.safeParse({
    dailyCalories: formData.get("dailyCalories"),
    dailyProteinGrams: formData.get("dailyProteinGrams"),
    dailyCarbsGrams: formData.get("dailyCarbsGrams"),
    dailyFatGrams: formData.get("dailyFatGrams"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await upsertGoals({ userId, ...validatedFields.data });
  revalidatePath("/nutrition");
}

export type SuggestionsState = { suggestions: FoodSuggestion[] } | { error: string } | undefined;

export async function getSuggestionsAction(): Promise<SuggestionsState> {
  const { userId } = await verifySession();

  const remaining = await getRemainingMacrosForDay(userId, new Date());
  if (!remaining) {
    return { error: "Set your daily macro goals first to get suggestions." };
  }

  try {
    const suggestions = await suggestFoodsForRemainingMacros(remaining);
    return { suggestions };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to get suggestions." };
  }
}
