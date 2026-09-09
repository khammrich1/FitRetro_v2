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

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const pantryItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  quantity: z.preprocess(optionalString, z.string().trim().optional()),
  unitCount: z.preprocess(optionalString, z.coerce.number().int().min(1).optional()),
  calories: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
  proteinGrams: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
  carbsGrams: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
  fatGrams: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
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
    unitCount: formData.get("unitCount"),
    calories: formData.get("calories"),
    proteinGrams: formData.get("proteinGrams"),
    carbsGrams: formData.get("carbsGrams"),
    fatGrams: formData.get("fatGrams"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, quantity, unitCount, calories, proteinGrams, carbsGrams, fatGrams } =
    validatedFields.data;

  await addPantryItem({
    userId,
    name,
    quantity: quantity ?? null,
    ...(unitCount !== undefined && {
      totalPortions: unitCount,
      portionsRemaining: unitCount,
      caloriesPerPortion: Math.round(calories ?? 0),
      proteinGramsPerPortion: proteinGrams ?? 0,
      carbsGramsPerPortion: carbsGrams ?? 0,
      fatGramsPerPortion: fatGrams ?? 0,
    }),
  });

  revalidatePath("/pantry");
  revalidatePath("/today");
}

const editPantryItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  quantity: z.preprocess(optionalString, z.string().trim().optional()),
  totalPortions: z.preprocess(optionalString, z.coerce.number().int().min(1).optional()),
  portionsRemaining: z.preprocess(optionalString, z.coerce.number().int().min(0).optional()),
  calories: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
  proteinGrams: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
  carbsGrams: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
  fatGrams: z.preprocess(optionalString, z.coerce.number().min(0).optional()),
});

export async function updatePantryItemAction(id: string, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = editPantryItemSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    totalPortions: formData.get("totalPortions"),
    portionsRemaining: formData.get("portionsRemaining"),
    calories: formData.get("calories"),
    proteinGrams: formData.get("proteinGrams"),
    carbsGrams: formData.get("carbsGrams"),
    fatGrams: formData.get("fatGrams"),
  });

  if (!validatedFields.success) return;

  const {
    name,
    quantity,
    totalPortions,
    portionsRemaining,
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
  } = validatedFields.data;

  const tracked = formData.get("trackUnits") !== null;

  await updatePantryItem(id, userId, {
    name,
    quantity: quantity ?? null,
    totalPortions: tracked ? (totalPortions ?? 1) : null,
    portionsRemaining: tracked ? (portionsRemaining ?? totalPortions ?? 1) : null,
    caloriesPerPortion: tracked ? Math.round(calories ?? 0) : null,
    proteinGramsPerPortion: tracked ? (proteinGrams ?? 0) : null,
    carbsGramsPerPortion: tracked ? (carbsGrams ?? 0) : null,
    fatGramsPerPortion: tracked ? (fatGrams ?? 0) : null,
  });

  revalidatePath("/pantry");
  revalidatePath("/today");
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
