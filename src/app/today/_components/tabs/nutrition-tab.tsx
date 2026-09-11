import type { NutritionGoal, PantryItem } from "@/db/schema";
import {
  summarizeMacros,
  type NutritionEntryWithItems,
  type MealTemplateWithItems,
} from "@/features/nutrition";
import type { DailyScore } from "@/lib/daily-score";
import type { MacroKey } from "@/lib/macro-order";
import { DailyScoreCard } from "../daily-score-card";
import { MacroProgress } from "../nutrition/macro-progress";
import { WaterTracker } from "../nutrition/water-tracker";
import { MealLogging } from "../nutrition/meal-logging";
import { MealList } from "../nutrition/meal-list";

export function NutritionTab({
  score,
  dayIso,
  consumed,
  goal,
  macroOrder,
  waterOunces,
  mealTemplates,
  pantryItems,
  entries,
}: {
  score: DailyScore;
  dayIso: string;
  consumed: ReturnType<typeof summarizeMacros>;
  goal: NutritionGoal | null;
  macroOrder: MacroKey[];
  waterOunces: number;
  mealTemplates: MealTemplateWithItems[];
  pantryItems: PantryItem[];
  entries: NutritionEntryWithItems[];
}) {
  return (
    <>
      <DailyScoreCard score={score} />
      <section className="flex flex-col gap-4">
        <MacroProgress consumed={consumed} goal={goal} macroOrder={macroOrder} />
        <WaterTracker
          key={dayIso}
          dayIso={dayIso}
          initialOunces={waterOunces}
          goalOunces={goal?.dailyWaterOunces ?? 64}
        />
        <MealLogging
          dayIso={dayIso}
          templates={mealTemplates}
          pantryItems={pantryItems}
          macroOrder={macroOrder}
        >
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
              Meals
            </h3>
            <MealList entries={entries} macroOrder={macroOrder} />
          </div>
        </MealLogging>
      </section>
    </>
  );
}
