import { and, asc, eq, inArray, gte, lt } from "drizzle-orm";
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
  return db.transaction(async (tx) => {
    const [routine] = await tx
      .select()
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .for("update");
    if (!routine) return null;

    const siblings = await tx
      .select({ sortOrder: routineItems.sortOrder })
      .from(routineItems)
      .where(eq(routineItems.routineId, routineId));
    const nextSortOrder =
      siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

    const [item] = await tx
      .insert(routineItems)
      .values({ routineId, name, notes, sortOrder: nextSortOrder })
      .returning();
    return item;
  });
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
    .orderBy(asc(routineItems.sortOrder), asc(routineItems.id));

  const index = siblings.findIndex((sibling) => sibling.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const expected = siblings.map((sibling) => sibling.id);
  const ordered = [...expected];
  [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  await reorderRoutineItems(item.routineId, userId, expected, ordered);
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

/** Sets the note on today's (or `day`'s) completion row for an item, if one exists. */
export async function updateRoutineCompletionNotes(
  itemId: string,
  userId: string,
  day: Date,
  notes: string | null,
): Promise<void> {
  const [item] = await db
    .select()
    .from(routineItems)
    .where(
      and(eq(routineItems.id, itemId), inArray(routineItems.routineId, ownedRoutineIds(userId))),
    );
  if (!item) return;

  const completedOn = toDateOnly(day);
  await db
    .update(routineCompletions)
    .set({ notes })
    .where(
      and(
        eq(routineCompletions.routineItemId, itemId),
        eq(routineCompletions.completedOn, completedOn),
      ),
    );
}

export type RoutineItemWithCompletion = RoutineItem & {
  completedToday: boolean;
  completionNotes: string | null;
};
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
    .orderBy(asc(routineItems.sortOrder), asc(routineItems.id));

  const itemIds = items.map((item) => item.id);
  const completedOn = toDateOnly(day);
  const completions =
    itemIds.length > 0
      ? await db
          .select({
            routineItemId: routineCompletions.routineItemId,
            notes: routineCompletions.notes,
          })
          .from(routineCompletions)
          .where(
            and(
              inArray(routineCompletions.routineItemId, itemIds),
              eq(routineCompletions.completedOn, completedOn),
            ),
          )
      : [];
  const completionByItemId = new Map(
    completions.map((completion) => [completion.routineItemId, completion.notes]),
  );

  const itemsByRoutineId = new Map<string, RoutineItemWithCompletion[]>();
  for (const item of items) {
    const withCompletion = {
      ...item,
      completedToday: completionByItemId.has(item.id),
      completionNotes: completionByItemId.get(item.id) ?? null,
    };
    const existing = itemsByRoutineId.get(item.routineId);
    if (existing) existing.push(withCompletion);
    else itemsByRoutineId.set(item.routineId, [withCompletion]);
  }

  return userRoutines.map((routine) => ({
    ...routine,
    items: itemsByRoutineId.get(routine.id) ?? [],
  }));
}

export type RoutineDayStats = { completed: number; withNotes: number };

/** Routine step completions per day for every day in [startIso, endIso), one query for a whole
 * month instead of one per day. */
export async function getRoutineCompletionStatsInRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<Map<string, RoutineDayStats>> {
  const rows = await db
    .select({ completedOn: routineCompletions.completedOn, notes: routineCompletions.notes })
    .from(routineCompletions)
    .innerJoin(routineItems, eq(routineCompletions.routineItemId, routineItems.id))
    .innerJoin(routines, eq(routineItems.routineId, routines.id))
    .where(
      and(
        eq(routines.userId, userId),
        gte(routineCompletions.completedOn, startIso),
        lt(routineCompletions.completedOn, endIso),
      ),
    );
  const stats = new Map<string, RoutineDayStats>();
  for (const row of rows) {
    const day = stats.get(row.completedOn) ?? { completed: 0, withNotes: 0 };
    day.completed += 1;
    if (row.notes?.trim()) day.withNotes += 1;
    stats.set(row.completedOn, day);
  }
  return stats;
}

/** Exact snapshot validation prevents stale reorders and foreign/missing IDs. Only sortOrder changes. */
export async function reorderRoutineItems(
  routineId: string,
  userId: string,
  expected: string[],
  ordered: string[],
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ id: routines.id })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .for("update");
    if (!owner) return false;
    const current = await tx
      .select({ id: routineItems.id })
      .from(routineItems)
      .where(eq(routineItems.routineId, routineId))
      .orderBy(asc(routineItems.sortOrder), asc(routineItems.id))
      .for("update");
    const ids = current.map((item) => item.id);
    if (
      ids.length !== expected.length ||
      ids.some((id, i) => id !== expected[i]) ||
      ordered.length !== ids.length ||
      new Set(ordered).size !== ids.length ||
      ordered.some((id) => !ids.includes(id))
    )
      return false;
    for (const [sortOrder, id] of ordered.entries()) {
      await tx
        .update(routineItems)
        .set({ sortOrder })
        .where(and(eq(routineItems.id, id), eq(routineItems.routineId, routineId)));
    }
    return true;
  });
}
