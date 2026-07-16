import { verifySession } from "@/features/auth";
import { getEntriesForDay, getGoals, summarizeMacros } from "@/features/nutrition";
import { MealForm } from "./_components/meal-form";
import { GoalsForm } from "./_components/goals-form";
import { MacroProgress } from "./_components/macro-progress";
import { SuggestionsPanel } from "./_components/suggestions-panel";

export default async function NutritionPage() {
  const { userId } = await verifySession();

  const today = new Date();
  const [goal, entries] = await Promise.all([getGoals(userId), getEntriesForDay(userId, today)]);
  const consumed = summarizeMacros(entries);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Nutrition</h1>

      <MacroProgress consumed={consumed} goal={goal} />

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
          Today&apos;s meals
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meals logged yet today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium capitalize">{entry.mealType}</span> —{" "}
                  {entry.description}
                </span>
                <span className="text-muted-foreground">{entry.calories} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MealForm />
      <SuggestionsPanel />
      <GoalsForm goal={goal} />
    </div>
  );
}
