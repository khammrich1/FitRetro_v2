import { and, asc, eq } from "drizzle-orm";
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

export async function updatePantryItem(
  id: string,
  userId: string,
  input: { name: string; quantity?: string | null },
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
