"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import { checkAiUsageAllowed } from "@/features/ai-usage";
import {
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  identifyPantryItemFromImage,
  type PantryItemIdentification,
} from "@/features/pantry";
import { SUPPORTED_IMAGE_MEDIA_TYPES, type SupportedImageMediaType } from "@/features/nutrition";

const mealPrepItemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.string().trim(),
  calories: z.coerce.number().min(0),
  proteinGrams: z.coerce.number().min(0),
  carbsGrams: z.coerce.number().min(0),
  fatGrams: z.coerce.number().min(0),
});

const mealPrepItemsSchema = z.array(mealPrepItemSchema);

function parseMealPrepItems(raw: FormDataEntryValue | null): z.infer<typeof mealPrepItemsSchema> {
  if (typeof raw !== "string") return [];
  try {
    const result = mealPrepItemsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

const mealPrepBatchSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  portions: z.coerce.number().int().min(1, "At least 1 portion."),
});

export type MealPrepBatchState = { errors?: Record<string, string[]> } | undefined;

/** Sums a batch's bulk ingredients, divides by portions, and adds one pantry item carrying the
 * per-portion macros — that's what makes it show up as a one-tap-loggable "prepped meal" on
 * Today (see logPantryItemAction in app/nutrition/actions.ts). */
export async function addMealPrepBatchAction(
  _state: MealPrepBatchState,
  formData: FormData,
): Promise<MealPrepBatchState> {
  const { userId } = await verifySession();

  const validatedFields = mealPrepBatchSchema.safeParse({
    name: formData.get("name"),
    portions: formData.get("portions"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const items = parseMealPrepItems(formData.get("items"));
  if (items.length === 0) {
    return { errors: { items: ["Add at least one ingredient."] } };
  }

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinGrams: acc.proteinGrams + item.proteinGrams,
      carbsGrams: acc.carbsGrams + item.carbsGrams,
      fatGrams: acc.fatGrams + item.fatGrams,
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );

  const { name, portions } = validatedFields.data;

  await addPantryItem({
    userId,
    name,
    caloriesPerPortion: Math.round(totals.calories / portions),
    proteinGramsPerPortion: totals.proteinGrams / portions,
    carbsGramsPerPortion: totals.carbsGrams / portions,
    fatGramsPerPortion: totals.fatGrams / portions,
    totalPortions: portions,
    portionsRemaining: portions,
  });

  revalidatePath("/pantry");
  revalidatePath("/meal-prep");
  revalidatePath("/today");
}

const pantryItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  quantity: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional(),
  ),
});

export type PantryItemState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function addPantryItemAction(
  _state: PantryItemState,
  formData: FormData,
): Promise<PantryItemState> {
  const { userId } = await verifySession();

  const validatedFields = pantryItemSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await addPantryItem({
    userId,
    name: validatedFields.data.name,
    quantity: validatedFields.data.quantity ?? null,
  });

  revalidatePath("/pantry");
}

export async function updatePantryItemAction(id: string, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = pantryItemSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
  });

  if (!validatedFields.success) return;

  await updatePantryItem(id, userId, {
    name: validatedFields.data.name,
    quantity: validatedFields.data.quantity ?? null,
  });

  revalidatePath("/pantry");
}

export async function deletePantryItemAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deletePantryItem(id, userId);
  revalidatePath("/pantry");
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function isSupportedImageMediaType(value: string): value is SupportedImageMediaType {
  return (SUPPORTED_IMAGE_MEDIA_TYPES as readonly string[]).includes(value);
}

export type IdentifyPantryItemState =
  { identification: PantryItemIdentification } | { error: string } | undefined;

export async function identifyPantryItemFromImageAction(
  formData: FormData,
): Promise<IdentifyPantryItemState> {
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

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const identification = await identifyPantryItemFromImage(buffer.toString("base64"), image.type);
    return { identification };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to identify the item from the photo.",
    };
  }
}
