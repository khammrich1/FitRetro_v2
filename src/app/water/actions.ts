"use server";

import { revalidatePath } from "next/cache";
import { verifySession, parseMemberDay } from "@/features/auth";
import { setWaterIntakeForDay } from "@/features/water";

const MAX_OUNCES = 300;

export async function setWaterIntakeAction(dayIso: string, ounces: number): Promise<void> {
  const { userId } = await verifySession();
  const clamped = Math.min(MAX_OUNCES, Math.max(0, Math.round(ounces)));
  await setWaterIntakeForDay(userId, await parseMemberDay(dayIso), clamped);
  revalidatePath("/today");
}
