"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import { checkAiUsageAllowed } from "@/features/ai-usage";
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
  saveMealTemplate,
  deleteMealTemplate,
  moveMealTemplate,
  getMealTemplateWithItems,
  summarizeMacros,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
  type FoodSuggestion,
  type MacroEstimate,
} from "@/features/nutrition";
import { listPantryItems } from "@/features/pantry";
import { generateRecipe, type GeneratedRecipe } from "@/features/recipes";
import { mealTypeEnum } from "@/db/schema";
import { parseDayParam } from "@/lib/date";

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

  revalidatePath("/today");
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

  await updateNutritionEntry(
    id,
    userId,
    validatedFields.data,
    parseLoggedItems(formData.get("items")),
  );
  revalidatePath("/today");
}

export async function deleteMealAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteNutritionEntry(id, userId);
  revalidatePath("/today");
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
  revalidatePath("/settings/nutrition");
  revalidatePath("/today");
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

  const usageCheck = await checkAiUsageAllowed(userId);
  if (!usageCheck.allowed) {
    return { error: usageCheck.error };
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
  const { userId } = await verifySession();

  if (!description.trim()) {
    return { error: "Describe what you ate first." };
  }

  const usageCheck = await checkAiUsageAllowed(userId);
  if (!usageCheck.allowed) {
    return { error: usageCheck.error };
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
  const { userId } = await verifySession();

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

  const usageCheck = await checkAiUsageAllowed(userId);
  if (!usageCheck.allowed) {
    return { error: usageCheck.error };
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
  description: z.string().trim(),
  calories: z.coerce.number().int().min(0),
  proteinGrams: z.coerce.number().min(0),
  carbsGrams: z.coerce.number().min(0),
  fatGrams: z.coerce.number().min(0),
});

export type LogSuggestionInput = z.infer<typeof logSuggestionSchema> & { dayIso: string };

/** Logs a food suggestion directly as a one-item meal entry, no form interaction needed. */
export async function logSuggestionAction(input: LogSuggestionInput): Promise<{ error?: string }> {
  const { userId } = await verifySession();

  const validatedFields = logSuggestionSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: "Couldn't log that suggestion — invalid data." };
  }

  const { mealType, name, description, calories, proteinGrams, carbsGrams, fatGrams } =
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
    [{ name, quantity: description, calories, proteinGrams, carbsGrams, fatGrams }],
  );

  revalidatePath("/today");
  return {};
}

export type RecipeState = { recipe: GeneratedRecipe } | { error: string } | undefined;

export async function getRecipeAction(
  name: string,
  description: string,
  macros: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number },
): Promise<RecipeState> {
  const { userId } = await verifySession();

  const usageCheck = await checkAiUsageAllowed(userId);
  if (!usageCheck.allowed) {
    return { error: usageCheck.error };
  }

  try {
    const recipe = await generateRecipe(name, description, macros);
    return { recipe };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate a recipe." };
  }
}

const saveMealTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  mealType: z.enum(mealTypeEnum.enumValues),
});

export type SaveMealTemplateState = { errors?: Record<string, string[]> } | undefined;

export async function saveMealTemplateAction(
  templateId: string | undefined,
  _state: SaveMealTemplateState,
  formData: FormData,
): Promise<SaveMealTemplateState> {
  const { userId } = await verifySession();

  const validatedFields = saveMealTemplateSchema.safeParse({
    name: formData.get("name"),
    mealType: formData.get("mealType"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const items = parseLoggedItems(formData.get("items"));
  if (items.length === 0) {
    return { errors: { items: ["Add at least one item."] } };
  }

  await saveMealTemplate(userId, { templateId, ...validatedFields.data, items });
  revalidatePath("/settings/meal-templates");
  revalidatePath("/today");
}

export async function deleteMealTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteMealTemplate(id, userId);
  revalidatePath("/settings/meal-templates");
  revalidatePath("/today");
}

export async function moveMealTemplateAction(id: string, direction: "up" | "down"): Promise<void> {
  const { userId } = await verifySession();
  await moveMealTemplate(id, userId, direction);
  revalidatePath("/settings/meal-templates");
  revalidatePath("/today");
}

/** Logs a saved meal template directly using its stored macros — no re-estimation needed. */
export async function logMealTemplateAction(
  templateId: string,
  dayIso: string,
): Promise<{ error?: string }> {
  const { userId } = await verifySession();

  const template = await getMealTemplateWithItems(templateId, userId);
  if (!template) return { error: "Template not found." };

  const totals = summarizeMacros(template.items);

  await logNutritionEntry(
    {
      userId,
      loggedAt: combineDayWithCurrentTime(dayIso),
      mealType: template.mealType,
      description: template.name,
      ...totals,
    },
    template.items.map(({ name, quantity, calories, proteinGrams, carbsGrams, fatGrams }) => ({
      name,
      quantity,
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
    })),
  );

  revalidatePath("/today");
  return {};
}
