"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  logNutritionEntry,
  updateNutritionEntry,
  deleteNutritionEntry,
  upsertGoals,
  getGoals,
  getRemainingMacrosForDay,
  suggestFoodsForRemainingMacros,
  estimateMacrosFromDescription,
  estimateMacrosFromImage,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
  type FoodSuggestion,
  type MacroEstimate,
} from "@/features/nutrition";
import { listPantryItems } from "@/features/pantry";
import { generateRecipe, type GeneratedRecipe } from "@/features/recipes";
import { mealTypeEnum } from "@/db/schema";

/** Parses a "YYYY-MM-DD" search-param date, falling back to today for missing/invalid input. */
function parseDayParam(dayIso: string | null | undefined): Date {
  if (!dayIso) return new Date();
  const parsed = new Date(`${dayIso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Combines a calendar day with the current time of day, so meals logged for a non-today day
 * (e.g. backfilling yesterday) still get a sensible timestamp rather than midnight. */
function combineDayWithCurrentTime(dayIso: string | null): Date {
  const now = new Date();
  const day = parseDayParam(dayIso);
  day.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return day;
}

const logMealSchema = z.object({
  mealType: z.enum(mealTypeEnum.enumValues),
  description: z.string().trim().min(1, "Description is required."),
  calories: z.coerce.number().int().min(0),
  proteinGrams: z.coerce.number().min(0),
  carbsGrams: z.coerce.number().min(0),
  fatGrams: z.coerce.number().min(0),
});

const loggedItemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.string().trim(),
  calories: z.coerce.number().int().min(0),
  proteinGrams: z.coerce.number().min(0),
  carbsGrams: z.coerce.number().min(0),
  fatGrams: z.coerce.number().min(0),
});

const loggedItemsSchema = z.array(loggedItemSchema);

/** Parses the "items" JSON field; invalid/missing input just means no itemized breakdown. */
function parseLoggedItems(raw: FormDataEntryValue | null): z.infer<typeof loggedItemsSchema> {
  if (typeof raw !== "string") return [];
  try {
    const result = loggedItemsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

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

  await logNutritionEntry(
    {
      userId,
      loggedAt: combineDayWithCurrentTime(formData.get("day")?.toString() ?? null),
      ...validatedFields.data,
    },
    parseLoggedItems(formData.get("items")),
  );

  revalidatePath("/nutrition");
}

export async function updateMealAction(id: string, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = logMealSchema.safeParse({
    mealType: formData.get("mealType"),
    description: formData.get("description"),
    calories: formData.get("calories"),
    proteinGrams: formData.get("proteinGrams"),
    carbsGrams: formData.get("carbsGrams"),
    fatGrams: formData.get("fatGrams"),
  });

  if (!validatedFields.success) return;

  // Editing here overrides whatever produced the original totals, so the item
  // breakdown (if any) no longer matches — clear it rather than leave it stale.
  await updateNutritionEntry(id, userId, validatedFields.data, []);
  revalidatePath("/nutrition");
}

export async function deleteMealAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteNutritionEntry(id, userId);
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

export async function getSuggestionsAction(
  dayIso?: string,
  preference?: string,
): Promise<SuggestionsState> {
  const { userId } = await verifySession();

  const remaining = await getRemainingMacrosForDay(userId, parseDayParam(dayIso));
  if (!remaining) {
    return { error: "Set your daily macro goals first to get suggestions." };
  }

  try {
    const [pantryItems, goal] = await Promise.all([listPantryItems(userId), getGoals(userId)]);
    const pantryItemNames = pantryItems.map((item) =>
      item.quantity ? `${item.name} (${item.quantity})` : item.name,
    );
    const suggestions = await suggestFoodsForRemainingMacros(
      remaining,
      pantryItemNames,
      preference,
      goal ?? undefined,
    );
    return { suggestions };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to get suggestions." };
  }
}

export type EstimateMacrosState = { estimate: MacroEstimate } | { error: string } | undefined;

export async function estimateMacrosAction(description: string): Promise<EstimateMacrosState> {
  await verifySession();

  if (!description.trim()) {
    return { error: "Describe what you ate first." };
  }

  try {
    const estimate = await estimateMacrosFromDescription(description);
    return { estimate };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to estimate macros." };
  }
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function isSupportedImageMediaType(value: string): value is SupportedImageMediaType {
  return (SUPPORTED_IMAGE_MEDIA_TYPES as readonly string[]).includes(value);
}

export async function estimateMacrosFromImageAction(
  formData: FormData,
): Promise<EstimateMacrosState> {
  await verifySession();

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return { error: "Attach a photo first." };
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return { error: "Photo is too large — please use one under 8MB." };
  }

  if (!isSupportedImageMediaType(image.type)) {
    return { error: "Unsupported image type — use JPEG, PNG, WebP, or GIF." };
  }

  const note = formData.get("note")?.toString().trim() || undefined;

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const estimate = await estimateMacrosFromImage(buffer.toString("base64"), image.type, note);
    return { estimate };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to estimate macros from photo.",
    };
  }
}

const logSuggestionSchema = z.object({
  mealType: z.enum(mealTypeEnum.enumValues),
  name: z.string().trim().min(1),
  calories: z.coerce.number().int().min(0),
  proteinGrams: z.coerce.number().min(0),
  carbsGrams: z.coerce.number().min(0),
  fatGrams: z.coerce.number().min(0),
  items: loggedItemsSchema.min(1),
});

export type LogSuggestionInput = z.infer<typeof logSuggestionSchema> & { dayIso: string };

/** Logs a food suggestion directly, with its itemized breakdown, no form interaction needed. */
export async function logSuggestionAction(input: LogSuggestionInput): Promise<{ error?: string }> {
  const { userId } = await verifySession();

  const validatedFields = logSuggestionSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: "Couldn't log that suggestion — invalid data." };
  }

  const { mealType, name, calories, proteinGrams, carbsGrams, fatGrams, items } =
    validatedFields.data;

  await logNutritionEntry(
    {
      userId,
      loggedAt: combineDayWithCurrentTime(input.dayIso),
      mealType,
      description: name,
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
    },
    items,
  );

  revalidatePath("/nutrition");
  return {};
}

export type RecipeState = { recipe: GeneratedRecipe } | { error: string } | undefined;

export async function getRecipeAction(
  name: string,
  description: string,
  macros: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number },
): Promise<RecipeState> {
  await verifySession();

  try {
    const recipe = await generateRecipe(name, description, macros);
    return { recipe };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate a recipe." };
  }
}
