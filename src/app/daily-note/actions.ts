"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/features/auth";
import { setDailyNoteForDay, cleanUpDailyNote } from "@/features/daily-note";
import { checkAiUsageAllowed } from "@/features/ai-usage";
import { parseDayParam } from "@/lib/date";

export async function setDailyNoteAction(dayIso: string, note: string): Promise<void> {
  const { userId } = await verifySession();
  await setDailyNoteForDay(userId, parseDayParam(dayIso), note);
  revalidatePath("/today");
}

export type CleanUpNoteState = { text: string } | { error: string };

export async function cleanUpNoteAction(rawText: string): Promise<CleanUpNoteState> {
  const { userId } = await verifySession();

  if (!rawText.trim()) {
    return { error: "Nothing to clean up yet." };
  }

  const usageCheck = await checkAiUsageAllowed(userId);
  if (!usageCheck.allowed) {
    return { error: usageCheck.error };
  }

  try {
    const text = await cleanUpDailyNote(rawText);
    return { text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to clean up the note." };
  }
}
