"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  identifyPantryItemFromImage,
  type PantryItemIdentification,
} from "@/features/pantry";
import { SUPPORTED_IMAGE_MEDIA_TYPES, type SupportedImageMediaType } from "@/features/nutrition";

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
