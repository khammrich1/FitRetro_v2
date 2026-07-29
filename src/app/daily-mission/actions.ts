"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  addMissionItem,
  updateMissionItem,
  deleteMissionItem,
  moveMissionItem,
  toggleMissionItemCompletion,
} from "@/features/daily-mission";
import { parseDayParam } from "@/lib/date";

function revalidateMissionPaths() {
  revalidatePath("/today");
  revalidatePath("/settings/daily-mission");
}

export type MissionItemState = { errors?: Record<string, string[]> } | undefined;

const missionItemSchema = z.object({
  label: z.string().trim().min(1, "A label is required."),
});

export async function addMissionItemAction(
  _state: MissionItemState,
  formData: FormData,
): Promise<MissionItemState> {
  const { userId } = await verifySession();

  const validatedFields = missionItemSchema.safeParse({ label: formData.get("label") });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await addMissionItem(userId, validatedFields.data.label);
  revalidateMissionPaths();
}

export async function updateMissionItemAction(id: string, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = missionItemSchema.safeParse({ label: formData.get("label") });
  if (!validatedFields.success) return;

  await updateMissionItem(id, userId, validatedFields.data.label);
  revalidateMissionPaths();
}

export async function deleteMissionItemAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteMissionItem(id, userId);
  revalidateMissionPaths();
}

export async function moveMissionItemAction(id: string, direction: "up" | "down"): Promise<void> {
  const { userId } = await verifySession();
  await moveMissionItem(id, userId, direction);
  revalidateMissionPaths();
}

export async function toggleMissionItemCompletionAction(id: string, dayIso: string): Promise<void> {
  const { userId } = await verifySession();
  await toggleMissionItemCompletion(id, userId, parseDayParam(dayIso));
  revalidateMissionPaths();
}
