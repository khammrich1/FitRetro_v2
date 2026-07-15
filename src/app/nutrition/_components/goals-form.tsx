"use client";

import { useActionState } from "react";
import { setGoalsAction } from "../actions";
import type { NutritionGoal } from "@/db/schema";

export function GoalsForm({ goal }: { goal: NutritionGoal | null }) {
  const [state, action, pending] = useActionState(setGoalsAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
    >
      <h2 className="font-semibold">Daily macro targets</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Calories
          <input
            name="dailyCalories"
            type="number"
            min={0}
            defaultValue={goal?.dailyCalories}
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Protein (g)
          <input
            name="dailyProteinGrams"
            type="number"
            min={0}
            step="0.1"
            defaultValue={goal?.dailyProteinGrams}
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Carbs (g)
          <input
            name="dailyCarbsGrams"
            type="number"
            min={0}
            step="0.1"
            defaultValue={goal?.dailyCarbsGrams}
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fat (g)
          <input
            name="dailyFatGrams"
            type="number"
            min={0}
            step="0.1"
            defaultValue={goal?.dailyFatGrams}
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>
      </div>

      {state?.errors && (
        <p className="text-sm text-red-600">Check the values above and try again.</p>
      )}

      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save targets"}
      </button>
    </form>
  );
}
