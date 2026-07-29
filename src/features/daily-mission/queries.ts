import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyMissionItems, dailyMissionCompletions, type DailyMissionItem } from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export async function addMissionItem(userId: string, label: string) {
  const siblings = await db
    .select({ sortOrder: dailyMissionItems.sortOrder })
    .from(dailyMissionItems)
    .where(eq(dailyMissionItems.userId, userId));
  const nextSortOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

  const [item] = await db
    .insert(dailyMissionItems)
    .values({ userId, label, sortOrder: nextSortOrder })
    .returning();
  return item;
}

export async function updateMissionItem(id: string, userId: string, label: string) {
  const [item] = await db
    .update(dailyMissionItems)
    .set({ label })
    .where(and(eq(dailyMissionItems.id, id), eq(dailyMissionItems.userId, userId)))
    .returning();
  return item ?? null;
}

export async function deleteMissionItem(id: string, userId: string) {
  await db
    .delete(dailyMissionItems)
    .where(and(eq(dailyMissionItems.id, id), eq(dailyMissionItems.userId, userId)));
}

export async function moveMissionItem(
  id: string,
  userId: string,
  direction: "up" | "down",
): Promise<void> {
  const siblings = await db
    .select()
    .from(dailyMissionItems)
    .where(eq(dailyMissionItems.userId, userId))
    .orderBy(asc(dailyMissionItems.sortOrder));

  const index = siblings.findIndex((sibling) => sibling.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const item = siblings[index];
  const swapWith = siblings[swapIndex];
  await db.transaction(async (tx) => {
    await tx
      .update(dailyMissionItems)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(dailyMissionItems.id, item.id));
    await tx
      .update(dailyMissionItems)
      .set({ sortOrder: item.sortOrder })
      .where(eq(dailyMissionItems.id, swapWith.id));
  });
}

/** Toggles completion of a mission item for `day`. Returns the new completed state, or null if the
 * item doesn't belong to `userId`. */
export async function toggleMissionItemCompletion(
  id: string,
  userId: string,
  day: Date,
): Promise<boolean | null> {
  const [item] = await db
    .select()
    .from(dailyMissionItems)
    .where(and(eq(dailyMissionItems.id, id), eq(dailyMissionItems.userId, userId)));
  if (!item) return null;

  const completedOn = toDateOnly(day);
  const existing = await db
    .select()
    .from(dailyMissionCompletions)
    .where(
      and(
        eq(dailyMissionCompletions.itemId, id),
        eq(dailyMissionCompletions.completedOn, completedOn),
      ),
    );

  if (existing.length > 0) {
    await db
      .delete(dailyMissionCompletions)
      .where(
        and(
          eq(dailyMissionCompletions.itemId, id),
          eq(dailyMissionCompletions.completedOn, completedOn),
        ),
      );
    return false;
  }

  await db.insert(dailyMissionCompletions).values({ itemId: id, completedOn });
  return true;
}

export type MissionItemWithCompletion = DailyMissionItem & { completedToday: boolean };

export async function getMissionItemsForUser(userId: string): Promise<DailyMissionItem[]> {
  return db
    .select()
    .from(dailyMissionItems)
    .where(eq(dailyMissionItems.userId, userId))
    .orderBy(asc(dailyMissionItems.sortOrder));
}

/** All of a user's mission items, ordered, with each item's completion state for `day`. */
export async function getMissionForDay(
  userId: string,
  day: Date,
): Promise<MissionItemWithCompletion[]> {
  const items = await getMissionItemsForUser(userId);
  if (items.length === 0) return [];

  const itemIds = items.map((item) => item.id);
  const completedOn = toDateOnly(day);
  const completions = await db
    .select({ itemId: dailyMissionCompletions.itemId })
    .from(dailyMissionCompletions)
    .where(
      and(
        inArray(dailyMissionCompletions.itemId, itemIds),
        eq(dailyMissionCompletions.completedOn, completedOn),
      ),
    );
  const completedIds = new Set(completions.map((completion) => completion.itemId));

  return items.map((item) => ({ ...item, completedToday: completedIds.has(item.id) }));
}
