"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession, parseMemberDay } from "@/features/auth";
import {
  createRoutine,
  deleteRoutine,
  addRoutineItem,
  updateRoutineItem,
  deleteRoutineItem,
  moveRoutineItem,
  reorderRoutineItems,
  toggleRoutineItemCompletion,
  updateRoutineCompletionNotes,
} from "@/features/routines";

function revalidateRoutinePaths() {
  revalidatePath("/today");
  revalidatePath("/settings/routines");
}

export type CreateRoutineState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

const createRoutineSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
});

export async function createRoutineAction(
  _state: CreateRoutineState,
  formData: FormData,
): Promise<CreateRoutineState> {
  const { userId } = await verifySession();

  const validatedFields = createRoutineSchema.safeParse({ name: formData.get("name") });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await createRoutine(userId, validatedFields.data.name);
  revalidateRoutinePaths();
}

export async function deleteRoutineAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteRoutine(id, userId);
  revalidateRoutinePaths();
}

const routineItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  notes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional(),
  ),
});

export type RoutineItemState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function addRoutineItemAction(
  routineId: string,
  _state: RoutineItemState,
  formData: FormData,
): Promise<RoutineItemState> {
  const { userId } = await verifySession();

  const validatedFields = routineItemSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await addRoutineItem(
    routineId,
    userId,
    validatedFields.data.name,
    validatedFields.data.notes ?? null,
  );
  revalidateRoutinePaths();
}

export async function updateRoutineItemAction(id: string, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = routineItemSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!validatedFields.success) return;

  await updateRoutineItem(id, userId, {
    name: validatedFields.data.name,
    notes: validatedFields.data.notes ?? null,
  });
  revalidateRoutinePaths();
}

export async function deleteRoutineItemAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteRoutineItem(id, userId);
  revalidateRoutinePaths();
}

export async function moveRoutineItemAction(id: string, direction: "up" | "down"): Promise<void> {
  const { userId } = await verifySession();
  await moveRoutineItem(id, userId, direction);
  revalidateRoutinePaths();
}

export async function toggleRoutineItemCompletionAction(id: string, dayIso: string): Promise<void> {
  const { userId } = await verifySession();
  await toggleRoutineItemCompletion(id, userId, await parseMemberDay(dayIso));
  revalidateRoutinePaths();
}

export async function updateRoutineCompletionNotesAction(
  id: string,
  notes: string,
  dayIso: string,
): Promise<void> {
  const { userId } = await verifySession();
  await updateRoutineCompletionNotes(
    id,
    userId,
    await parseMemberDay(dayIso),
    notes.trim() || null,
  );
  revalidateRoutinePaths();
}

export async function reorderRoutineItemsAction(
  routineId: string,
  expected: string[],
  ordered: string[],
): Promise<{ error?: string }> {
  const { userId } = await verifySession();
  const schema = z.object({
    routineId: z.uuid(),
    expected: z.array(z.uuid()).max(500),
    ordered: z.array(z.uuid()).max(500),
  });
  const parsed = schema.safeParse({ routineId, expected, ordered });
  if (!parsed.success) return { error: "Invalid step order. Reload and try again." };
  try {
    if (!(await reorderRoutineItems(routineId, userId, expected, ordered))) {
      revalidateRoutinePaths();
      return { error: "These steps changed. Reloaded the saved order; please try again." };
    }
    revalidateRoutinePaths();
    return {};
  } catch {
    return { error: "Could not save the order. Restoring the saved steps; please try again." };
  }
}
