"use client";

import { useActionState } from "react";
import { setGoalsAction } from "@/app/nutrition/actions";
import type { NutritionGoal } from "@/db/schema";
import { MACRO_LABELS, type MacroKey } from "@/lib/macro-order";

const FIELD_NAME: Record<MacroKey, string> = {
  fat: "dailyFatGrams",
  carbs: "dailyCarbsGrams",
  protein: "dailyProteinGrams",
};

export function GoalsForm({
  goal,
  macroOrder,
}: {
  goal: NutritionGoal | null;
  macroOrder: MacroKey[];
}) {
  const [state, action, pending] = useActionState(setGoalsAction, undefined);

  const defaultValue: Record<MacroKey, number | undefined> = {
    fat: goal?.dailyFatGrams,
    carbs: goal?.dailyCarbsGrams,
    protein: goal?.dailyProteinGrams,
  };

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
        Daily macro targets
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Calories
          <input
            name="dailyCalories"
            type="number"
            min={0}
            defaultValue={goal?.dailyCalories}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        {macroOrder.map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            {MACRO_LABELS[key]} (g)
            <input
              name={FIELD_NAME[key]}
              type="number"
              min={0}
              step="any"
              defaultValue={defaultValue[key]}
              className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        ))}

        <label className="flex flex-col gap-1 text-sm">
          Water (oz)
          <input
            name="dailyWaterOunces"
            type="number"
            min={0}
            defaultValue={goal?.dailyWaterOunces ?? 64}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      {state?.errors && (
        <p className="text-sm text-danger">Check the values above and try again.</p>
      )}

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save targets"}
      </button>
    </form>
  );
}
