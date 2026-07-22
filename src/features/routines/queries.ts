import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { routines, routineItems, routineCompletions, type RoutineItem } from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function ownedRoutineIds(userId: string) {
  return db.select({ id: routines.id }).from(routines).where(eq(routines.userId, userId));
}

export async function createRoutine(userId: string, name: string) {
  const [routine] = await db.insert(routines).values({ userId, name }).returning();
  return routine;
}

export async function deleteRoutine(id: string, userId: string) {
  await db.delete(routines).where(and(eq(routines.id, id), eq(routines.userId, userId)));
}

export async function addRoutineItem(
  routineId: string,
  userId: string,
  name: string,
  notes: string | null,
) {
  const [routine] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)));
  if (!routine) return null;

  const siblings = await db
    .select({ sortOrder: routineItems.sortOrder })
    .from(routineItems)
    .where(eq(routineItems.routineId, routineId));
  const nextSortOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

  const [item] = await db
    .insert(routineItems)
    .values({ routineId, name, notes, sortOrder: nextSortOrder })
    .returning();
  return item;
}

export async function updateRoutineItem(
  id: string,
  userId: string,
  input: { name: string; notes: string | null },
) {
  const [item] = await db
    .update(routineItems)
    .set(input)
    .where(and(eq(routineItems.id, id), inArray(routineItems.routineId, ownedRoutineIds(userId))))
    .returning();
  return item ?? null;
}

export async function deleteRoutineItem(id: string, userId: string) {
  await db
    .delete(routineItems)
    .where(and(eq(routineItems.id, id), inArray(routineItems.routineId, ownedRoutineIds(userId))));
}

export async function moveRoutineItem(
  itemId: string,
  userId: string,
  direction: "up" | "down",
): Promise<void> {
  const [item] = await db
    .select()
    .from(routineItems)
    .where(
      and(eq(routineItems.id, itemId), inArray(routineItems.routineId, ownedRoutineIds(userId))),
    );
  if (!item) return;

  const siblings = await db
    .select()
    .from(routineItems)
    .where(eq(routineItems.routineId, item.routineId))
    .orderBy(asc(routineItems.sortOrder));

  const index = siblings.findIndex((sibling) => sibling.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const swapWith = siblings[swapIndex];
  await db.transaction(async (tx) => {
    await tx
      .update(routineItems)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(routineItems.id, item.id));
    await tx
      .update(routineItems)
      .set({ sortOrder: item.sortOrder })
      .where(eq(routineItems.id, swapWith.id));
  });
}

/** Toggles today's (or `day`'s) completion for a routine item. Returns the new completed state. */
export async function toggleRoutineItemCompletion(
  itemId: string,
  userId: string,
  day: Date,
): Promise<boolean | null> {
  const [item] = await db
    .select()
    .from(routineItems)
    .where(
      and(eq(routineItems.id, itemId), inArray(routineItems.routineId, ownedRoutineIds(userId))),
    );
  if (!item) return null;

  const completedOn = toDateOnly(day);
  const existing = await db
    .select()
    .from(routineCompletions)
    .where(
      and(
        eq(routineCompletions.routineItemId, itemId),
        eq(routineCompletions.completedOn, completedOn),
      ),
    );

  if (existing.length > 0) {
    await db
      .delete(routineCompletions)
      .where(
        and(
          eq(routineCompletions.routineItemId, itemId),
          eq(routineCompletions.completedOn, completedOn),
        ),
      );
    return false;
  }

  await db.insert(routineCompletions).values({ routineItemId: itemId, completedOn });
  return true;
}

export type RoutineItemWithCompletion = RoutineItem & { completedToday: boolean };
export type RoutineWithItems = typeof routines.$inferSelect & {
  items: RoutineItemWithCompletion[];
};

/** All of a user's routines, items ordered within each, with each item's completion state for `day`. */
export async function getRoutinesForUser(userId: string, day: Date): Promise<RoutineWithItems[]> {
  const userRoutines = await db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(asc(routines.createdAt));

  if (userRoutines.length === 0) return [];

  const routineIds = userRoutines.map((routine) => routine.id);
  const items = await db
    .select()
    .from(routineItems)
    .where(inArray(routineItems.routineId, routineIds))
    .orderBy(asc(routineItems.sortOrder));

  const itemIds = items.map((item) => item.id);
  const completedOn = toDateOnly(day);
  const completions =
    itemIds.length > 0
      ? await db
          .select({ routineItemId: routineCompletions.routineItemId })
          .from(routineCompletions)
          .where(
            and(
              inArray(routineCompletions.routineItemId, itemIds),
              eq(routineCompletions.completedOn, completedOn),
            ),
          )
      : [];
  const completedItemIds = new Set(completions.map((completion) => completion.routineItemId));

  const itemsByRoutineId = new Map<string, RoutineItemWithCompletion[]>();
  for (const item of items) {
    const withCompletion = { ...item, completedToday: completedItemIds.has(item.id) };
    const existing = itemsByRoutineId.get(item.routineId);
    if (existing) existing.push(withCompletion);
    else itemsByRoutineId.set(item.routineId, [withCompletion]);
  }

  return userRoutines.map((routine) => ({
    ...routine,
    items: itemsByRoutineId.get(routine.id) ?? [],
  }));
}
