import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyMissionEntries, type DailyMissionEntry } from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export async function getMissionForDay(userId: string, day: Date): Promise<DailyMissionEntry[]> {
  return db
    .select()
    .from(dailyMissionEntries)
    .where(
      and(eq(dailyMissionEntries.userId, userId), eq(dailyMissionEntries.day, toDateOnly(day))),
    )
    .orderBy(asc(dailyMissionEntries.sortOrder));
}

export async function addMissionEntry(userId: string, day: Date, label: string) {
  const dayIso = toDateOnly(day);
  const siblings = await db
    .select({ sortOrder: dailyMissionEntries.sortOrder })
    .from(dailyMissionEntries)
    .where(and(eq(dailyMissionEntries.userId, userId), eq(dailyMissionEntries.day, dayIso)));
  const nextSortOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

  const [entry] = await db
    .insert(dailyMissionEntries)
    .values({ userId, day: dayIso, label, sortOrder: nextSortOrder })
    .returning();
  return entry;
}

export async function updateMissionEntry(id: string, userId: string, label: string) {
  const [entry] = await db
    .update(dailyMissionEntries)
    .set({ label })
    .where(and(eq(dailyMissionEntries.id, id), eq(dailyMissionEntries.userId, userId)))
    .returning();
  return entry ?? null;
}

export async function deleteMissionEntry(id: string, userId: string) {
  await db
    .delete(dailyMissionEntries)
    .where(and(eq(dailyMissionEntries.id, id), eq(dailyMissionEntries.userId, userId)));
}

export async function moveMissionEntry(
  id: string,
  userId: string,
  day: Date,
  direction: "up" | "down",
): Promise<void> {
  const siblings = await getMissionForDay(userId, day);
  const index = siblings.findIndex((sibling) => sibling.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const entry = siblings[index];
  const swapWith = siblings[swapIndex];
  await db.transaction(async (tx) => {
    await tx
      .update(dailyMissionEntries)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(dailyMissionEntries.id, entry.id));
    await tx
      .update(dailyMissionEntries)
      .set({ sortOrder: entry.sortOrder })
      .where(eq(dailyMissionEntries.id, swapWith.id));
  });
}

/** Toggles a mission entry's completed flag. Returns the new state, or null if it doesn't belong
 * to `userId`. */
export async function toggleMissionEntryCompletion(
  id: string,
  userId: string,
): Promise<boolean | null> {
  const [entry] = await db
    .select()
    .from(dailyMissionEntries)
    .where(and(eq(dailyMissionEntries.id, id), eq(dailyMissionEntries.userId, userId)));
  if (!entry) return null;

  const [updated] = await db
    .update(dailyMissionEntries)
    .set({ completed: !entry.completed })
    .where(eq(dailyMissionEntries.id, id))
    .returning();
  return updated.completed;
}
