import { verifySession } from "@/features/auth";
import { getEntriesForDay, getGoals, summarizeMacros } from "@/features/nutrition";
import { MealForm } from "./_components/meal-form";
import { GoalsForm } from "./_components/goals-form";
import { MacroProgress } from "./_components/macro-progress";
import { SuggestionsPanel } from "./_components/suggestions-panel";
import { DayNav } from "./_components/day-nav";
import { MealList } from "./_components/meal-list";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayParam(dateParam: string | undefined): Date {
  if (!dateParam) return new Date();
  const parsed = new Date(`${dateParam}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId } = await verifySession();
  const { date: dateParam } = await searchParams;
  const day = parseDayParam(dateParam);
  const dayIso = toIsoDate(day);

  const [goal, entries] = await Promise.all([getGoals(userId), getEntriesForDay(userId, day)]);
  const consumed = summarizeMacros(entries);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Nutrition</h1>

      <DayNav date={day} />

      <MacroProgress consumed={consumed} goal={goal} />

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">Meals</h2>
        <MealList entries={entries} />
      </div>

      <MealForm dayIso={dayIso} />
      <SuggestionsPanel dayIso={dayIso} />
      <GoalsForm goal={goal} />
    </div>
  );
}
