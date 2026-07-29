"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  addMissionEntry,
  updateMissionEntry,
  deleteMissionEntry,
  moveMissionEntry,
  toggleMissionEntryCompletion,
} from "@/features/daily-mission";
import { parseDayParam } from "@/lib/date";

function revalidateMissionPaths() {
  revalidatePath("/today");
}

export type MissionEntryState = { errors?: Record<string, string[]> } | undefined;

const missionEntrySchema = z.object({
  label: z.string().trim().min(1, "A label is required."),
});

export async function addMissionEntryAction(
  dayIso: string,
  _state: MissionEntryState,
  formData: FormData,
): Promise<MissionEntryState> {
  const { userId } = await verifySession();

  const validatedFields = missionEntrySchema.safeParse({ label: formData.get("label") });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await addMissionEntry(userId, parseDayParam(dayIso), validatedFields.data.label);
  revalidateMissionPaths();
}

export async function updateMissionEntryAction(id: string, formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const validatedFields = missionEntrySchema.safeParse({ label: formData.get("label") });
  if (!validatedFields.success) return;

  await updateMissionEntry(id, userId, validatedFields.data.label);
  revalidateMissionPaths();
}

export async function deleteMissionEntryAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteMissionEntry(id, userId);
  revalidateMissionPaths();
}

export async function moveMissionEntryAction(
  id: string,
  dayIso: string,
  direction: "up" | "down",
): Promise<void> {
  const { userId } = await verifySession();
  await moveMissionEntry(id, userId, parseDayParam(dayIso), direction);
  revalidateMissionPaths();
}

export async function toggleMissionEntryCompletionAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await toggleMissionEntryCompletion(id, userId);
  revalidateMissionPaths();
}
