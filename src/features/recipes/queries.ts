import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recipes, type NewRecipe } from "@/db/schema";

export async function createRecipe(input: NewRecipe) {
  const [recipe] = await db.insert(recipes).values(input).returning();
  return recipe;
}

export async function getRecipesForUser(userId: string) {
  return db.select().from(recipes).where(eq(recipes.userId, userId));
}

export async function getRecipeById(recipeId: string) {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  return recipe ?? null;
}
