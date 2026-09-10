import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { pantryItems, type NewPantryItem } from "@/db/schema";

export async function listPantryItems(userId: string) {
  return db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId))
    .orderBy(asc(pantryItems.name));
}

export async function addPantryItem(input: NewPantryItem) {
  const [item] = await db.insert(pantryItems).values(input).returning();
  return item;
}

export async function getPantryItemById(id: string, userId: string) {
  const [item] = await db
    .select()
    .from(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));
  return item ?? null;
}

export async function updatePantryItem(
  id: string,
  userId: string,
  input: {
    name: string;
    quantity?: string | null;
    totalPortions?: number | null;
    portionsRemaining?: number | null;
    caloriesPerPortion?: number | null;
    proteinGramsPerPortion?: number | null;
    carbsGramsPerPortion?: number | null;
    fatGramsPerPortion?: number | null;
  },
) {
  const [item] = await db
    .update(pantryItems)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
    .returning();
  return item ?? null;
}

export async function deletePantryItem(id: string, userId: string) {
  await db.delete(pantryItems).where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));
}

/** Atomically decrements a meal-prepped item's remaining portion count by `amount`, guarded so it
 * never goes below 0 even under concurrent taps. Returns null (no-op) if there weren't enough
 * left. */
export async function decrementPantryItemPortion(id: string, userId: string, amount = 1) {
  const [item] = await db
    .update(pantryItems)
    .set({
      portionsRemaining: sql`${pantryItems.portionsRemaining} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pantryItems.id, id),
        eq(pantryItems.userId, userId),
        gte(pantryItems.portionsRemaining, amount),
      ),
    )
    .returning();
  return item ?? null;
}
