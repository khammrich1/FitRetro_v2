"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/features/auth";
import {
  setMissionField,
  toggleMissionFieldCompletion,
  type MissionFieldIndex,
} from "@/features/daily-mission";
import { parseDayParam } from "@/lib/date";

function revalidateMissionPaths() {
  revalidatePath("/today");
}

export async function setMissionFieldAction(
  dayIso: string,
  fieldIndex: MissionFieldIndex,
  value: string,
): Promise<void> {
  const { userId } = await verifySession();
  await setMissionField(userId, parseDayParam(dayIso), fieldIndex, value.trim());
  revalidateMissionPaths();
}

export async function toggleMissionFieldCompletionAction(
  dayIso: string,
  fieldIndex: MissionFieldIndex,
): Promise<void> {
  const { userId } = await verifySession();
  await toggleMissionFieldCompletion(userId, parseDayParam(dayIso), fieldIndex);
  revalidateMissionPaths();
}
