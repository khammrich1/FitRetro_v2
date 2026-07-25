import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import {
  nutritionEntries,
  nutritionEntryItems,
  nutritionGoals,
  mealTemplates,
  mealTemplateItems,
  type NewNutritionEntry,
  type NewNutritionEntryItem,
  type NutritionEntryItem,
  type NewNutritionGoal,
  type MealType,
} from "@/db/schema";

export type LoggedItemInput = Omit<NewNutritionEntryItem, "id" | "entryId">;
export type NutritionEntryWithItems = typeof nutritionEntries.$inferSelect & {
  items: NutritionEntryItem[];
};

export async function logNutritionEntry(input: NewNutritionEntry, items: LoggedItemInput[] = []) {
  return db.transaction(async (tx) => {
    const [entry] = await tx.insert(nutritionEntries).values(input).returning();
    if (items.length > 0) {
      await tx
        .insert(nutritionEntryItems)
        .values(items.map((item) => ({ ...item, entryId: entry.id })));
    }
    return entry;
  });
}

export async function updateNutritionEntry(
  id: string,
  userId: string,
  input: Omit<NewNutritionEntry, "id" | "userId" | "loggedAt">,
  items: LoggedItemInput[] = [],
) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .update(nutritionEntries)
      .set(input)
      .where(and(eq(nutritionEntries.id, id), eq(nutritionEntries.userId, userId)))
      .returning();

    if (!entry) return null;

    await tx.delete(nutritionEntryItems).where(eq(nutritionEntryItems.entryId, id));
    if (items.length > 0) {
      await tx.insert(nutritionEntryItems).values(items.map((item) => ({ ...item, entryId: id })));
    }

    return entry;
  });
}

export async function deleteNutritionEntry(id: string, userId: string) {
  await db
    .delete(nutritionEntries)
    .where(and(eq(nutritionEntries.id, id), eq(nutritionEntries.userId, userId)));
}

/** Returns all entries logged for the given user on the calendar day of `day`, with their items. */
export async function getEntriesForDay(
  userId: string,
  day: Date,
): Promise<NutritionEntryWithItems[]> {
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  const entries = await db
    .select()
    .from(nutritionEntries)
    .where(
      and(
        eq(nutritionEntries.userId, userId),
        gte(nutritionEntries.loggedAt, startOfDay),
        lt(nutritionEntries.loggedAt, startOfNextDay),
      ),
    );

  if (entries.length === 0) return [];

  const items = await db
    .select()
    .from(nutritionEntryItems)
    .where(
      inArray(
        nutritionEntryItems.entryId,
        entries.map((entry) => entry.id),
      ),
    );

  const itemsByEntryId = new Map<string, NutritionEntryItem[]>();
  for (const item of items) {
    const existing = itemsByEntryId.get(item.entryId);
    if (existing) existing.push(item);
    else itemsByEntryId.set(item.entryId, [item]);
  }

  return entries.map((entry) => ({ ...entry, items: itemsByEntryId.get(entry.id) ?? [] }));
}

export async function getGoals(userId: string) {
  const [goal] = await db.select().from(nutritionGoals).where(eq(nutritionGoals.userId, userId));
  return goal ?? null;
}

export async function upsertGoals(input: NewNutritionGoal) {
  const [goal] = await db
    .insert(nutritionGoals)
    .values(input)
    .onConflictDoUpdate({
      target: nutritionGoals.userId,
      set: {
        dailyCalories: input.dailyCalories,
        dailyProteinGrams: input.dailyProteinGrams,
        dailyCarbsGrams: input.dailyCarbsGrams,
        dailyFatGrams: input.dailyFatGrams,
        updatedAt: new Date(),
      },
    })
    .returning();
  return goal;
}

export type RemainingMacros = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

/** Daily goals minus what's already been logged today; negative values mean the goal was exceeded. */
export async function getRemainingMacrosForDay(
  userId: string,
  day: Date,
): Promise<RemainingMacros | null> {
  const goal = await getGoals(userId);
  if (!goal) return null;

  const entries = await getEntriesForDay(userId, day);
  const consumed = summarizeMacros(entries);

  return {
    calories: goal.dailyCalories - consumed.calories,
    proteinGrams: goal.dailyProteinGrams - consumed.proteinGrams,
    carbsGrams: goal.dailyCarbsGrams - consumed.carbsGrams,
    fatGrams: goal.dailyFatGrams - consumed.fatGrams,
  };
}

export function summarizeMacros(
  entries: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number }[],
) {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      proteinGrams: totals.proteinGrams + entry.proteinGrams,
      carbsGrams: totals.carbsGrams + entry.carbsGrams,
      fatGrams: totals.fatGrams + entry.fatGrams,
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );
}

export type MealTemplateItemInput = {
  name: string;
  quantity: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type MealTemplateWithItems = typeof mealTemplates.$inferSelect & {
  items: (typeof mealTemplateItems.$inferSelect)[];
};

/** Creates a new meal template, or (when `templateId` is given) replaces an existing one's items. */
export async function saveMealTemplate(
  userId: string,
  input: {
    templateId?: string;
    name: string;
    mealType: MealType;
    items: MealTemplateItemInput[];
  },
) {
  return db.transaction(async (tx) => {
    let templateId = input.templateId;

    if (templateId) {
      const [updated] = await tx
        .update(mealTemplates)
        .set({ name: input.name, mealType: input.mealType })
        .where(and(eq(mealTemplates.id, templateId), eq(mealTemplates.userId, userId)))
        .returning();
      if (!updated) throw new Error("Template not found.");
      await tx.delete(mealTemplateItems).where(eq(mealTemplateItems.templateId, templateId));
    } else {
      const siblings = await tx
        .select({ sortOrder: mealTemplates.sortOrder })
        .from(mealTemplates)
        .where(eq(mealTemplates.userId, userId));
      const nextSortOrder =
        siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

      const [created] = await tx
        .insert(mealTemplates)
        .values({ userId, name: input.name, mealType: input.mealType, sortOrder: nextSortOrder })
        .returning();
      templateId = created.id;
    }

    if (input.items.length > 0) {
      await tx.insert(mealTemplateItems).values(
        input.items.map((item, sortOrder) => ({
          templateId: templateId!,
          ...item,
          sortOrder,
        })),
      );
    }

    return templateId;
  });
}

export async function deleteMealTemplate(id: string, userId: string) {
  await db
    .delete(mealTemplates)
    .where(and(eq(mealTemplates.id, id), eq(mealTemplates.userId, userId)));
}

export async function moveMealTemplate(
  id: string,
  userId: string,
  direction: "up" | "down",
): Promise<void> {
  const [template] = await db
    .select()
    .from(mealTemplates)
    .where(and(eq(mealTemplates.id, id), eq(mealTemplates.userId, userId)));
  if (!template) return;

  const siblings = await db
    .select()
    .from(mealTemplates)
    .where(eq(mealTemplates.userId, userId))
    .orderBy(asc(mealTemplates.sortOrder), asc(mealTemplates.createdAt));

  const index = siblings.findIndex((sibling) => sibling.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const swapWith = siblings[swapIndex];
  await db.transaction(async (tx) => {
    await tx
      .update(mealTemplates)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(mealTemplates.id, template.id));
    await tx
      .update(mealTemplates)
      .set({ sortOrder: template.sortOrder })
      .where(eq(mealTemplates.id, swapWith.id));
  });
}

/** All of a user's saved meal templates, each with its ordered item list. */
export async function getMealTemplatesForUser(userId: string): Promise<MealTemplateWithItems[]> {
  const templates = await db
    .select()
    .from(mealTemplates)
    .where(eq(mealTemplates.userId, userId))
    .orderBy(asc(mealTemplates.sortOrder), asc(mealTemplates.createdAt));

  const itemsByTemplate = await Promise.all(
    templates.map((template) =>
      db
        .select()
        .from(mealTemplateItems)
        .where(eq(mealTemplateItems.templateId, template.id))
        .orderBy(asc(mealTemplateItems.sortOrder)),
    ),
  );

  return templates.map((template, i) => ({ ...template, items: itemsByTemplate[i] }));
}

export async function getMealTemplateWithItems(
  id: string,
  userId: string,
): Promise<MealTemplateWithItems | null> {
  const [template] = await db
    .select()
    .from(mealTemplates)
    .where(and(eq(mealTemplates.id, id), eq(mealTemplates.userId, userId)));
  if (!template) return null;

  const items = await db
    .select()
    .from(mealTemplateItems)
    .where(eq(mealTemplateItems.templateId, id))
    .orderBy(asc(mealTemplateItems.sortOrder));

  return { ...template, items };
}
