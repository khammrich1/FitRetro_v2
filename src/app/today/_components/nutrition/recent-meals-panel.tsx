"use client";

import type { NutritionEntryWithItems } from "@/features/nutrition";
import type { MealPrefill } from "./meal-form";

export function RecentMealsPanel({
  entries,
  onChoose,
}: {
  entries: NutritionEntryWithItems[];
  onChoose: (meal: MealPrefill) => void;
}) {
  const seen = new Set<string>();
  const meals = entries
    .filter((entry) => {
      const key = JSON.stringify([
        entry.description.trim().toLowerCase(),
        entry.calories,
        entry.proteinGrams,
        entry.carbsGrams,
        entry.fatGrams,
        entry.items
          .map(({ name, quantity, calories, proteinGrams, carbsGrams, fatGrams }) => [
            name,
            quantity,
            calories,
            proteinGrams,
            carbsGrams,
            fatGrams,
          ])
          .sort(),
      ]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
  if (!meals.length) return null;
  return (
    <section
      aria-labelledby="recent-meals-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2 id="recent-meals-heading" className="text-sm font-semibold text-foreground">
        Eat it again
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Add a recent meal to your draft, adjust anything, then log it below.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {meals.map((entry) => (
          <li key={entry.id} className="min-w-0">
            <button
              type="button"
              onClick={() =>
                onChoose({
                  description: entry.description,
                  items: entry.items.length
                    ? entry.items.map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        calories: item.calories,
                        proteinGrams: item.proteinGrams,
                        carbsGrams: item.carbsGrams,
                        fatGrams: item.fatGrams,
                      }))
                    : [
                        {
                          name: entry.description,
                          quantity: "",
                          calories: entry.calories,
                          proteinGrams: entry.proteinGrams,
                          carbsGrams: entry.carbsGrams,
                          fatGrams: entry.fatGrams,
                        },
                      ],
                })
              }
              aria-label={`Add ${entry.description} to meal draft`}
              className="flex min-h-11 w-full flex-col rounded-md border border-border px-3 py-2 text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="w-full break-words text-sm font-medium">{entry.description}</span>
              <span className="text-xs text-muted-foreground">
                {entry.calories} kcal · Add to draft
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
