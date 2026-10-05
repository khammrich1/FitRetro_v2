"use server";

import { revalidatePath } from "next/cache";
import { verifySession, parseMemberDay } from "@/features/auth";
import {
  setMissionField,
  toggleMissionFieldCompletion,
  type MissionFieldIndex,
} from "@/features/daily-mission";

function revalidateMissionPaths() {
  revalidatePath("/today");
}

export async function setMissionFieldAction(
  dayIso: string,
  fieldIndex: MissionFieldIndex,
  value: string,
): Promise<void> {
  const { userId } = await verifySession();
  await setMissionField(userId, await parseMemberDay(dayIso), fieldIndex, value.trim());
  revalidateMissionPaths();
}

export async function toggleMissionFieldCompletionAction(
  dayIso: string,
  fieldIndex: MissionFieldIndex,
): Promise<void> {
  const { userId } = await verifySession();
  await toggleMissionFieldCompletion(userId, await parseMemberDay(dayIso), fieldIndex);
  revalidateMissionPaths();
}
